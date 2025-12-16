import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { School } from '@/types/school';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SchoolContextType {
  currentSchool: School | null;
  availableSchools: School[];
  switchSchool: (schoolId: string) => Promise<void>;
  isLoading: boolean;
  refetchSchools: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserSchools = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('[SchoolContext] Carregando escolas do usuário:', user.id);
      
      // Buscar escolas via school_memberships
      const { data: memberships, error: memberError } = await (supabase as any)
        .from('school_memberships')
        .select(`
          school_id,
          schools (*)
        `)
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (memberError) {
        console.error('[SchoolContext] Erro ao buscar memberships:', memberError);
        throw memberError;
      }

      if (!memberships || memberships.length === 0) {
        console.warn('[SchoolContext] Usuário sem escolas cadastradas');
        setAvailableSchools([]);
        setCurrentSchool(null);
        setIsLoading(false);
        return;
      }

      // Extrair escolas dos memberships
      const membershipSchools = memberships
        .map((m: any) => m.schools)
        .filter((s: any) => s && s.is_active) as School[];
      
      // Buscar permissões extras de secretária (multi-escola)
      let additionalSchools: School[] = [];
      if (user.role === 'secretaria') {
        const { data: permissions } = await (supabase as any)
          .from('secretaria_permissions')
          .select('permission_value')
          .eq('secretaria_id', user.id)
          .eq('permission_key', 'manage_all_schools');

        if (permissions && permissions.length > 0) {
          for (const perm of permissions) {
            const permValue = perm.permission_value as any;
            let permSchools = permValue?.schools;
            
            if (typeof permSchools === 'string') {
              try { permSchools = JSON.parse(permSchools); } catch (e) {}
            }
            
            if (permSchools === '*' || (Array.isArray(permSchools) && permSchools.includes('*'))) {
              // Permissão total: buscar TODAS as escolas ativas
              const { data: allSchools } = await (supabase as any)
                .from('schools')
                .select('*')
                .eq('is_active', true);
              
              additionalSchools = allSchools || [];
              break;
            } else if (Array.isArray(permSchools) && permSchools.length > 0) {
              // Escolas específicas
              const { data: specificSchools } = await (supabase as any)
                .from('schools')
                .select('*')
                .in('id', permSchools)
                .eq('is_active', true);
              
              additionalSchools = specificSchools || [];
            }
          }
        }
      }

      // Combinar memberships + permissions e remover duplicatas
      const allSchools = [...membershipSchools, ...additionalSchools];
      const schools = Array.from(
        new Map(allSchools.map(s => [s.id, s])).values()
      ).sort((a, b) => a.name.localeCompare(b.name));
      
      setAvailableSchools(schools);

      // Determinar escola atual
      let current = schools.find((s: School) => s.id === user.currentSchoolId);
      
      // Fallback: primeira escola se não tiver currentSchoolId
      if (!current && schools.length > 0) {
        current = schools[0];
        // Atualizar perfil com a escola default
        await (supabase as any)
          .from('profiles')
          .update({ current_school_id: current.id })
          .eq('id', user.id);
        
        updateUser({ currentSchoolId: current.id });
      }

      setCurrentSchool(current || null);
      console.log('[SchoolContext] ✅ Escola atual:', current?.name);
      
    } catch (error) {
      console.error('[SchoolContext] Erro ao carregar escolas:', error);
      toast.error('Não foi possível carregar suas escolas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [user, updateUser]);

  useEffect(() => {
    loadUserSchools();
  }, [loadUserSchools]);

  // Real-time subscription para detectar mudanças em is_student_access_active
  useEffect(() => {
    if (!currentSchool?.id) return;

    console.log('[SchoolContext] Configurando real-time para escola:', currentSchool.id);
    
    const channel = supabase
      .channel(`school-${currentSchool.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schools',
          filter: `id=eq.${currentSchool.id}`
        },
        (payload) => {
          console.log('[SchoolContext] 🔔 Mudança detectada em escola:', payload);
          
          const newRecord = payload.new as any;
          if (newRecord && 'is_student_access_active' in newRecord) {
            setCurrentSchool(prev => prev ? {
              ...prev,
              is_student_access_active: newRecord.is_student_access_active
            } : null);
            
            console.log('[SchoolContext] is_student_access_active atualizado para:', newRecord.is_student_access_active);
          }
        }
      )
      .subscribe((status) => {
        console.log('[SchoolContext] Status da subscription:', status);
      });

    return () => {
      console.log('[SchoolContext] Removendo subscription');
      supabase.removeChannel(channel);
    };
  }, [currentSchool?.id]);

  const switchSchool = async (schoolId: string) => {
    if (!user || schoolId === currentSchool?.id) return;
    
    try {
      console.log('[SchoolContext] Trocando escola para:', schoolId);
      
      // Atualizar no banco
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ current_school_id: schoolId })
        .eq('id', user.id);

      if (error) throw error;

      // Atualizar estado local
      const school = availableSchools.find(s => s.id === schoolId);
      setCurrentSchool(school || null);
      updateUser({ currentSchoolId: schoolId });
      
      // Invalidar cache React Query ao invés de reload
      queryClient.invalidateQueries();
      
      toast.success(`Você está agora em: ${school?.name}`);
      
    } catch (error) {
      console.error('[SchoolContext] Erro ao trocar escola:', error);
      toast.error('Não foi possível alterar a escola. Tente novamente.');
    }
  };

  return (
    <SchoolContext.Provider 
      value={{ 
        currentSchool, 
        availableSchools, 
        switchSchool, 
        isLoading,
        refetchSchools: loadUserSchools
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within SchoolProvider');
  }
  return context;
};

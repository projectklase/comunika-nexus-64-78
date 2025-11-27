import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { School } from '@/types/school';
import { useSubscription } from './useSubscription';

interface CreateSchoolData {
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
}

interface UpdateSchoolData extends Partial<CreateSchoolData> {}

interface SchoolStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSecretarias: number;
}

export function useSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { canAddSchools, limits } = useSubscription();

  const loadSchools = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);

      // Get all schools where user has membership
      const { data: memberships, error: membershipsError } = await supabase
        .from('school_memberships')
        .select('school_id')
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;

      if (!memberships || memberships.length === 0) {
        setSchools([]);
        return;
      }

      const schoolIds = memberships.map(m => m.school_id);

      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .in('id', schoolIds)
        .order('name');

      if (error) throw error;

      setSchools(data || []);
    } catch (error) {
      console.error('[useSchools] Error loading schools:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar escolas",
        description: "Não foi possível carregar as escolas."
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const createSchool = async (data: CreateSchoolData) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // ✅ VALIDAR LIMITES DE ASSINATURA PRIMEIRO
      if (!canAddSchools) {
        toast({
          variant: "destructive",
          title: "Limite de escolas atingido",
          description: `Você atingiu o limite de ${limits?.max_schools || 0} escolas do seu plano. Faça upgrade para adicionar mais unidades.`
        });
        throw new Error('School limit reached');
      }

      // Check if slug is unique
      const { data: existing } = await supabase
        .from('schools')
        .select('id')
        .eq('slug', data.slug)
        .single();

      if (existing) {
        toast({
          variant: "destructive",
          title: "Slug já existe",
          description: "Este identificador já está em uso. Escolha outro."
        });
        throw new Error('Slug already exists');
      }

      // Create school
      const { data: newSchool, error } = await supabase
        .from('schools')
        .insert([{
          name: data.name,
          slug: data.slug,
          logo_url: data.logo_url,
          primary_color: data.primary_color,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Create school membership for current admin
      const { error: membershipError } = await supabase
        .from('school_memberships')
        .insert([{
          user_id: user.id,
          school_id: newSchool.id,
          role: 'administrador',
          is_primary: false
        }]);

      if (membershipError) throw membershipError;

      toast({
        title: "Escola criada com sucesso",
        description: `${data.name} foi adicionada ao sistema.`
      });

      await loadSchools();
    } catch (error) {
      console.error('[useSchools] Error creating school:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar escola",
        description: "Não foi possível criar a escola."
      });
      throw error;
    }
  };

  const updateSchool = async (id: string, data: UpdateSchoolData) => {
    try {
      // If slug is being changed, check uniqueness
      if (data.slug) {
        const { data: existing } = await supabase
          .from('schools')
          .select('id')
          .eq('slug', data.slug)
          .neq('id', id)
          .single();

        if (existing) {
          toast({
            variant: "destructive",
            title: "Slug já existe",
            description: "Este identificador já está em uso."
          });
          throw new Error('Slug already exists');
        }
      }

      const { error } = await supabase
        .from('schools')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Escola atualizada",
        description: "As informações da escola foram atualizadas."
      });

      await loadSchools();
    } catch (error) {
      console.error('[useSchools] Error updating school:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar escola",
        description: "Não foi possível atualizar a escola."
      });
      throw error;
    }
  };

  const deleteSchool = async (id: string) => {
    try {
      // Delete school (cascades to memberships, settings, etc via DB constraints)
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Escola excluída",
        description: "A escola foi removida do sistema."
      });

      await loadSchools();
    } catch (error) {
      console.error('[useSchools] Error deleting school:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir escola",
        description: "Não foi possível excluir a escola."
      });
      throw error;
    }
  };

  const getSchoolStats = async (schoolId: string): Promise<SchoolStats> => {
    try {
      // Get students count
      const { count: studentsCount } = await supabase
        .from('school_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('role', 'aluno');

      // Get teachers count
      const { count: teachersCount } = await supabase
        .from('school_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('role', 'professor');

      // Get secretarias count
      const { count: secretariasCount } = await supabase
        .from('school_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('role', 'secretaria');

      // Get classes count
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);

      return {
        totalStudents: studentsCount || 0,
        totalTeachers: teachersCount || 0,
        totalClasses: classesCount || 0,
        totalSecretarias: secretariasCount || 0
      };
    } catch (error) {
      console.error('[useSchools] Error getting school stats:', error);
      return {
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        totalSecretarias: 0
      };
    }
  };

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  return {
    schools,
    isLoading,
    createSchool,
    updateSchool,
    deleteSchool,
    getSchoolStats,
    refetch: loadSchools
  };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { School } from '@/types/school';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook que busca todas as escolas disponíveis para o usuário atual.
 * 
 * Para administradores: todas as escolas que ele tem acesso via school_memberships
 * Para secretárias: escolas via memberships + escolas concedidas via secretaria_permissions
 * 
 * Usado no TeacherFormModal para permitir seleção de múltiplas escolas.
 */
export function useAvailableSchools() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableSchools = useCallback(async () => {
    if (!user) {
      setSchools([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🏫 [useAvailableSchools] Buscando escolas disponíveis para:', user.email);

      // 1. Buscar escolas via school_memberships (normal)
      const { data: memberships, error: memberError } = await supabase
        .from('school_memberships')
        .select(`
          school_id,
          schools (*)
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const membershipSchools = memberships
        ?.map((m: any) => m.schools)
        .filter((s: any) => s && s.is_active) as School[] || [];

      console.log('✅ [useAvailableSchools] Escolas via memberships:', membershipSchools.length);

      // 2. Buscar permissões adicionais (para secretárias)
      const { data: permissions, error: permError } = await supabase
        .from('secretaria_permissions')
        .select('permission_value')
        .eq('secretaria_id', user.id)
        .eq('permission_key', 'manage_all_schools');

      if (permError && permError.code !== 'PGRST116') { // Ignora se tabela não existe ainda
        console.warn('⚠️ [useAvailableSchools] Erro ao buscar permissões (ignorável):', permError);
      }

      let additionalSchools: School[] = [];

      if (permissions && permissions.length > 0) {
        console.log('🔑 [useAvailableSchools] Permissões encontradas:', permissions);

        // Coletar IDs de escolas adicionais das permissões
        const additionalSchoolIds: string[] = [];

        for (const perm of permissions) {
          const permValue = perm.permission_value as any;
          const schools = permValue?.schools;
          if (schools === '*' || (Array.isArray(schools) && schools.includes('*'))) {
            // Permissão total: buscar TODAS as escolas ativas
            const { data: allSchools, error: allError } = await supabase
              .from('schools')
              .select('*')
              .eq('is_active', true);

            if (allError) throw allError;
            
            additionalSchools = allSchools || [];
            console.log('🌟 [useAvailableSchools] Permissão TOTAL concedida:', additionalSchools.length, 'escolas');
            break; // Já tem acesso a todas, não precisa continuar
          } else if (Array.isArray(schools)) {
            additionalSchoolIds.push(...schools);
          }
        }

        // Se não tem permissão total, buscar escolas específicas
        if (additionalSchools.length === 0 && additionalSchoolIds.length > 0) {
          const { data: specificSchools, error: specificError } = await supabase
            .from('schools')
            .select('*')
            .in('id', additionalSchoolIds)
            .eq('is_active', true);

          if (specificError) throw specificError;
          
          additionalSchools = specificSchools || [];
          console.log('🎯 [useAvailableSchools] Escolas específicas concedidas:', additionalSchools.length);
        }
      }

      // 3. Combinar e remover duplicatas
      const allSchools = [...membershipSchools, ...additionalSchools];
      const uniqueSchools = Array.from(
        new Map(allSchools.map(s => [s.id, s])).values()
      ).sort((a, b) => a.name.localeCompare(b.name));

      console.log('✅ [useAvailableSchools] Total de escolas disponíveis:', uniqueSchools.length);
      setSchools(uniqueSchools);

    } catch (err) {
      console.error('❌ [useAvailableSchools] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar escolas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAvailableSchools();
  }, [fetchAvailableSchools]);

  return {
    schools,
    loading,
    error,
    refetch: fetchAvailableSchools,
  };
}

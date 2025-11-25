import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface School {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  is_active: boolean;
}

/**
 * Hook para buscar todas as escolas disponíveis para o usuário atual
 * - Administradores: todas as escolas ativas
 * - Secretaria: apenas escolas onde tem membership
 */
export function useAvailableSchools() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchools = useCallback(async () => {
    if (!user) {
      setSchools([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (user.role === 'administrador') {
        // Admin global: todas as escolas ativas
        const { data, error: fetchError } = await supabase
          .from('schools')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (fetchError) throw fetchError;
        setSchools(data || []);
      } else if (user.role === 'secretaria') {
        console.log('[useAvailableSchools] 🔍 Secretaria detected, user.id:', user.id);
        
        // 1. Verificar se tem permissão manage_all_schools
        const { data: permissions, error: permError } = await supabase
          .from('secretaria_permissions')
          .select('permission_key, permission_value')
          .eq('secretaria_id', user.id)
          .eq('permission_key', 'manage_all_schools');

        console.log('[useAvailableSchools] 📋 Permissions query result:', { 
          permissions, 
          permError,
          permissionsLength: permissions?.length 
        });

        if (permError) {
          console.warn('[useAvailableSchools] ⚠️ Error fetching permissions:', permError);
        }

        if (permissions && permissions.length > 0) {
          const perm = permissions[0];
          console.log('[useAvailableSchools] ✅ Permission found:', perm);
          console.log('[useAvailableSchools] 🔧 permission_value type:', typeof perm.permission_value);
          console.log('[useAvailableSchools] 📦 permission_value raw:', JSON.stringify(perm.permission_value));
          
          const value = perm.permission_value as { schools?: string[] };
          console.log('[useAvailableSchools] 🎯 Parsed value.schools:', value?.schools);
          
          if (value.schools?.includes('*')) {
            console.log('[useAvailableSchools] 🌍 Grant ALL schools access');
            // Acesso total - retornar TODAS as escolas ativas
            const { data, error: fetchError } = await supabase
              .from('schools')
              .select('*')
              .eq('is_active', true)
              .order('name');

            if (fetchError) throw fetchError;
            console.log('[useAvailableSchools] 📚 Fetched ALL schools count:', data?.length);
            setSchools(data || []);
            setLoading(false);
            return;
          } else if (value.schools && value.schools.length > 0) {
            console.log('[useAvailableSchools] 🏫 Grant specific schools:', value.schools);
            // Acesso parcial - combinar memberships + escolas permitidas
            const { data: memberships, error: membershipError } = await supabase
              .from('school_memberships')
              .select('school_id')
              .eq('user_id', user.id);

            if (membershipError) throw membershipError;

            const membershipSchoolIds = memberships?.map(m => m.school_id) || [];
            const allSchoolIds = [...new Set([...membershipSchoolIds, ...value.schools])];
            console.log('[useAvailableSchools] 🔗 Combined school IDs:', { membershipSchoolIds, permittedSchools: value.schools, allSchoolIds });

            if (allSchoolIds.length === 0) {
              setSchools([]);
              setLoading(false);
              return;
            }

            const { data, error: fetchError } = await supabase
              .from('schools')
              .select('*')
              .in('id', allSchoolIds)
              .eq('is_active', true)
              .order('name');

            if (fetchError) throw fetchError;
            console.log('[useAvailableSchools] 📚 Fetched specific schools count:', data?.length);
            setSchools(data || []);
            setLoading(false);
            return;
          }
        } else {
          console.log('[useAvailableSchools] ❌ No permissions found, fallback to memberships');
        }

        // 2. Fallback: apenas escolas onde tem membership (comportamento original)
        console.log('[useAvailableSchools] 🔙 Using fallback: membership-only schools');
        const { data: memberships, error: membershipError } = await supabase
          .from('school_memberships')
          .select('school_id')
          .eq('user_id', user.id);

        if (membershipError) throw membershipError;

        const schoolIds = memberships?.map(m => m.school_id) || [];
        console.log('[useAvailableSchools] 🎓 Membership school IDs:', schoolIds);

        if (schoolIds.length === 0) {
          setSchools([]);
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('schools')
          .select('*')
          .in('id', schoolIds)
          .eq('is_active', true)
          .order('name');

        if (fetchError) throw fetchError;
        console.log('[useAvailableSchools] 📚 Final schools count (fallback):', data?.length);
        setSchools(data || []);
      } else {
        // Outros roles não têm acesso
        setSchools([]);
      }
    } catch (err) {
      console.error('Error fetching available schools:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar escolas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  return { schools, loading, error, refetch: fetchSchools };
}

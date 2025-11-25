import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!user) {
      setSchools([]);
      setLoading(false);
      return;
    }

    const fetchSchools = async () => {
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
          // Secretaria: apenas escolas onde tem membership
          const { data: memberships, error: membershipError } = await supabase
            .from('school_memberships')
            .select('school_id')
            .eq('user_id', user.id);

          if (membershipError) throw membershipError;

          const schoolIds = memberships?.map(m => m.school_id) || [];

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
    };

    fetchSchools();
  }, [user]);

  return { schools, loading, error };
}

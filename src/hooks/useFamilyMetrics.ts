import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { FamilyMetrics } from '@/types/family-metrics';

/**
 * Hook para buscar métricas de vínculos familiares
 * Apenas administradores podem acessar via RLS
 */
export function useFamilyMetrics() {
  const { currentSchool } = useSchool();

  return useQuery({
    queryKey: ['family-metrics', currentSchool?.id],
    queryFn: async (): Promise<FamilyMetrics> => {
      if (!currentSchool) {
        throw new Error('Escola não selecionada');
      }

      const { data, error } = await supabase.rpc(
        'get_family_metrics',
        { school_id_param: currentSchool.id }
      );

      if (error) {
        console.error('Erro ao buscar métricas familiares:', error);
        throw error;
      }

      return data as unknown as FamilyMetrics;
    },
    enabled: !!currentSchool,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
  });
}

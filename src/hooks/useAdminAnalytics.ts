import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EvasionRiskAnalytics } from '@/types/admin-analytics';
import { useSchool } from '@/contexts/SchoolContext';

export function useAdminAnalytics(daysFilter: number = 30) {
  const { currentSchool } = useSchool();

  return useQuery({
    queryKey: ['admin-analytics', 'evasion-risk', daysFilter, currentSchool?.id],
    queryFn: async (): Promise<EvasionRiskAnalytics> => {
      if (!currentSchool) {
        throw new Error('Escola não selecionada');
      }

      const { data, error } = await supabase.rpc(
        'get_evasion_risk_analytics',
        { 
          days_filter: daysFilter,
          school_id_param: currentSchool.id
        }
      );
      
      if (error) {
        console.error('Erro ao buscar analytics:', error);
        throw error;
      }
      
      return data as unknown as EvasionRiskAnalytics;
    },
    enabled: !!currentSchool,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 min
  });
}

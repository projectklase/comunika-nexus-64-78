import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EvasionRiskAnalytics } from '@/types/admin-analytics';

export function useAdminAnalytics(daysFilter: number = 30) {
  return useQuery({
    queryKey: ['admin-analytics', 'evasion-risk', daysFilter],
    queryFn: async (): Promise<EvasionRiskAnalytics> => {
      const { data, error } = await supabase.rpc(
        'get_evasion_risk_analytics',
        { days_filter: daysFilter }
      );
      
      if (error) {
        console.error('Erro ao buscar analytics:', error);
        throw error;
      }
      
      return data as unknown as EvasionRiskAnalytics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 min
  });
}

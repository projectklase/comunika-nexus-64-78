import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InsightsResponse } from '@/types/school-insights';

export function useSchoolInsights(daysFilter: number) {
  return useQuery({
    queryKey: ['school-insights', daysFilter],
    queryFn: async (): Promise<InsightsResponse> => {
      const { data, error } = await supabase.functions.invoke('generate-school-insights', {
        body: { daysFilter },
      });

      if (error) {
        console.error('Erro ao gerar insights:', error);
        throw error;
      }

      if (!data || !data.insights) {
        throw new Error('Resposta inválida da função de insights');
      }

      return data as InsightsResponse;
    },
    staleTime: 15 * 60 * 1000, // 15 minutos - insights são caros de gerar
    refetchOnWindowFocus: false, // Não refetch automático
    retry: 1, // Apenas 1 retry para evitar consumo excessivo
  });
}

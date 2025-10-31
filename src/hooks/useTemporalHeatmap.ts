import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeatmapPoint {
  day_of_week: number;
  hour: number;
  count: number;
}

export interface BestPublishTime {
  day_of_week: number;
  hour: number;
  activities_published: number;
  deliveries_received: number;
  success_rate: number;
}

export interface TemporalHeatmap {
  login_heatmap: HeatmapPoint[];
  delivery_heatmap: HeatmapPoint[];
  best_publish_times: BestPublishTime[];
}

export function useTemporalHeatmap(daysFilter: number = 30) {
  return useQuery({
    queryKey: ['temporal-heatmap', daysFilter],
    queryFn: async (): Promise<TemporalHeatmap> => {
      const { data, error } = await supabase.rpc(
        'get_temporal_heatmap' as any,
        { days_filter: daysFilter }
      );
      
      if (error) {
        console.error('Erro ao buscar mapa de calor temporal:', error);
        throw error;
      }
      
      const result = data as any;
      return {
        login_heatmap: result?.login_heatmap || [],
        delivery_heatmap: result?.delivery_heatmap || [],
        best_publish_times: result?.best_publish_times || [],
      } as TemporalHeatmap;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeatmapDataPoint {
  day_of_week: number; // 0-6 (domingo-sábado)
  hour: number; // 0-23
  count: number;
}

export interface WeeklyHeatmapData {
  deliveries_heatmap: HeatmapDataPoint[];
  posts_heatmap: HeatmapDataPoint[];
  peak_hour: string;
  peak_day: string;
  total_deliveries: number;
}

function processHeatmapData(data: any[], dateField: string): HeatmapDataPoint[] {
  const grouped: Record<string, number> = {};
  
  data?.forEach(item => {
    if (!item[dateField]) return;
    const date = new Date(item[dateField]);
    const dow = date.getDay();
    const hour = date.getHours();
    const key = `${dow}-${hour}`;
    grouped[key] = (grouped[key] || 0) + 1;
  });
  
  return Object.entries(grouped).map(([key, count]) => {
    const [dow, hour] = key.split('-').map(Number);
    return { day_of_week: dow, hour, count };
  });
}

function findPeakHour(data: HeatmapDataPoint[]): string {
  if (!data || data.length === 0) return '--';
  const peak = data.reduce((max, curr) => curr.count > max.count ? curr : max, data[0]);
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return `${days[peak.day_of_week]} ${peak.hour}h`;
}

function findPeakDay(data: HeatmapDataPoint[]): string {
  if (!data || data.length === 0) return '--';
  const dayTotals = data.reduce((acc, { day_of_week, count }) => {
    acc[day_of_week] = (acc[day_of_week] || 0) + count;
    return acc;
  }, {} as Record<number, number>);
  
  const peakDayIdx = Object.entries(dayTotals).reduce((max, [day, count]) => 
    count > (dayTotals[max] || 0) ? parseInt(day) : max, 0
  );
  
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[peakDayIdx];
}

export function useWeeklyHeatmap(daysFilter: number = 30) {
  return useQuery({
    queryKey: ['weekly-heatmap', daysFilter],
    queryFn: async (): Promise<WeeklyHeatmapData> => {
      const startDate = new Date(Date.now() - daysFilter * 24 * 60 * 60 * 1000).toISOString();
      
      // Query para entregas
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('submitted_at')
        .gte('submitted_at', startDate)
        .not('submitted_at', 'is', null);
      
      if (deliveriesError) throw deliveriesError;
      
      // Query para posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('created_at')
        .eq('status', 'PUBLISHED')
        .gte('created_at', startDate);
      
      if (postsError) throw postsError;
      
      // Processar dados
      const deliveriesHeatmap = processHeatmapData(deliveriesData || [], 'submitted_at');
      const postsHeatmap = processHeatmapData(postsData || [], 'created_at');
      
      return {
        deliveries_heatmap: deliveriesHeatmap,
        posts_heatmap: postsHeatmap,
        peak_hour: findPeakHour(deliveriesHeatmap),
        peak_day: findPeakDay(deliveriesHeatmap),
        total_deliveries: deliveriesData?.length || 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Activity {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
  deadline: string;
  total_views: number;
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  approved_deliveries: number;
  rejected_deliveries: number;
  avg_grade: number;
  avg_completion_days: number;
}

export interface TopPerformer {
  id: string;
  title: string;
  type: string;
  deliveries: number;
  avg_grade: number;
  success_score: number;
  approved_deliveries: number;
}

export interface LowEngagement {
  id: string;
  title: string;
  type: string;
  created_at: string;
  total_views: number;
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  avg_grade: number;
  engagement_rate: number;
}

export interface ActivitiesLibrary {
  activities: Activity[];
  top_performers: TopPerformer[];
  low_engagement: LowEngagement[];
}

export function useActivitiesLibrary(daysFilter: number = 90) {
  return useQuery({
    queryKey: ['activities-library', daysFilter],
    queryFn: async (): Promise<ActivitiesLibrary> => {
      const { data, error } = await supabase.rpc(
        'get_activities_library' as any,
        { days_filter: daysFilter }
      );
      
      if (error) {
        console.error('Erro ao buscar biblioteca de atividades:', error);
        throw error;
      }
      
      const result = data as any;
      return {
        activities: result?.activities || [],
        top_performers: result?.top_performers || [],
        low_engagement: result?.low_engagement || [],
      } as ActivitiesLibrary;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000,
  });
}

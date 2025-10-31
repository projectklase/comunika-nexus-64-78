import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExecutiveDashboard {
  total_students: number;
  active_students_today: number;
  active_students_yesterday: number;
  active_students_change: number;
  total_activities: number;
  activities_today: number;
  total_deliveries: number;
  deliveries_today: number;
  pending_evaluations: number;
  avg_grade: number;
  health_score: number;
}

export function useExecutiveDashboard(daysFilter: number = 30) {
  return useQuery({
    queryKey: ['executive-dashboard', daysFilter],
    queryFn: async (): Promise<ExecutiveDashboard> => {
      const { data, error } = await supabase.rpc(
        'get_executive_dashboard' as any,
        { days_filter: daysFilter }
      );
      
      if (error) {
        console.error('Erro ao buscar dashboard executivo:', error);
        throw error;
      }
      
      return data as ExecutiveDashboard;
    },
    staleTime: 60 * 1000, // 1 minuto
    refetchInterval: 60 * 1000, // Atualiza a cada 1 min
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClassComparison {
  id: string;
  name: string;
  status: string;
  total_students: number;
  active_students_7d: number;
  total_activities: number;
  total_deliveries: number;
  approved_deliveries: number;
  rejected_deliveries: number;
  pending_deliveries: number;
  completion_rate: number;
  avg_grade: number;
  avg_delivery_time_days: number;
}

export function useClassesComparison(daysFilter: number = 30) {
  return useQuery({
    queryKey: ['classes-comparison', daysFilter],
    queryFn: async (): Promise<ClassComparison[]> => {
      const { data, error } = await supabase.rpc(
        'get_classes_comparison' as any,
        { days_filter: daysFilter }
      );
      
      if (error) {
        console.error('Erro ao buscar comparativo de turmas:', error);
        throw error;
      }
      
      return (data || []) as ClassComparison[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 min
  });
}

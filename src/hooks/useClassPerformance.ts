import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClassPerformanceAnalytics } from '@/types/class-performance';

export function useClassPerformance(classId: string | null, daysFilter: number = 30) {
  return useQuery({
    queryKey: ['class-performance', classId, daysFilter],
    queryFn: async (): Promise<ClassPerformanceAnalytics | null> => {
      if (!classId) return null;

      const { data, error } = await supabase.rpc(
        'get_class_performance_analytics',
        { 
          p_class_id: classId,
          days_filter: daysFilter 
        }
      );
      
      if (error) {
        console.error('Erro ao buscar performance da turma:', error);
        throw error;
      }
      
      return data as unknown as ClassPerformanceAnalytics;
    },
    enabled: !!classId, // Só executa se classId existir
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

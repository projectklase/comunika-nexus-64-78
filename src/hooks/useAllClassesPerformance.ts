import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClassPerformanceAnalytics } from '@/types/class-performance';

export function useAllClassesPerformance(classIds: string[], daysFilter: number = 30) {
  return useQuery({
    queryKey: ['all-classes-performance', classIds, daysFilter],
    queryFn: async (): Promise<ClassPerformanceAnalytics[]> => {
      if (classIds.length === 0) return [];

      // Buscar performance de todas as turmas em paralelo
      const promises = classIds.map(classId =>
        supabase.rpc('get_class_performance_analytics', {
          p_class_id: classId,
          days_filter: daysFilter
        })
      );

      const results = await Promise.all(promises);

      return results
        .map(({ data, error }) => {
          if (error) {
            console.error('Erro ao buscar performance da turma:', error);
            return null;
          }
          return data as unknown as ClassPerformanceAnalytics;
        })
        .filter(Boolean) as ClassPerformanceAnalytics[];
    },
    enabled: classIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

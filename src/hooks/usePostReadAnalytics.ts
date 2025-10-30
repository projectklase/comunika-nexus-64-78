import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PostReadAnalytics } from '@/types/post-read-analytics';

export function usePostReadAnalytics(daysFilter: number = 30) {
  return useQuery({
    queryKey: ['admin-analytics', 'post-reads', daysFilter],
    queryFn: async (): Promise<PostReadAnalytics> => {
      const { data, error } = await supabase.rpc(
        'get_post_read_analytics',
        { days_filter: daysFilter }
      );
      
      if (error) {
        console.error('Erro ao buscar analytics de leituras:', error);
        throw error;
      }
      
      return data as unknown as PostReadAnalytics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 min
  });
}

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
    staleTime: 30 * 1000, // 30 segundos (atualização mais rápida)
    refetchInterval: 60 * 1000, // Atualiza a cada 1 minuto
    refetchOnWindowFocus: true, // Atualiza quando usuário volta para a aba
  });
}

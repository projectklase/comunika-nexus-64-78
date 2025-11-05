import { useQueryClient } from '@tanstack/react-query';

export function useInvalidatePostAnalytics() {
  const queryClient = useQueryClient();

  return () => {
    // Invalida cache de analytics quando leituras são registradas
    queryClient.invalidateQueries({ queryKey: ['admin-analytics', 'post-reads'] });
  };
}

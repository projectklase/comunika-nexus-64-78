import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEventMetrics(eventId?: string) {
  return useQuery({
    queryKey: ['event-metrics', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      const [confirmations, invitations] = await Promise.all([
        supabase
          .from('event_confirmations')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId),
        supabase
          .from('event_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId),
      ]);
      
      return {
        confirmationsCount: confirmations.count || 0,
        invitationsCount: invitations.count || 0,
      };
    },
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 segundos
  });
}

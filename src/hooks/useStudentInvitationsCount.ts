import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStudentInvitationsCount(eventId: string, studentId: string) {
  return useQuery({
    queryKey: ['student-invitations-count', eventId, studentId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('event_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('inviting_student_id', studentId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventId && !!studentId,
    staleTime: 10 * 1000, // 10 segundos
  });
}

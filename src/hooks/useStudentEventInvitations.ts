import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StudentInvitation {
  id: string;
  friend_name: string;
  friend_dob: string;
  friend_contact: string | null;
  parent_name: string | null;
  parent_contact: string | null;
  created_at: string;
}

export function useStudentEventInvitations(eventId: string, studentId: string) {
  const queryClient = useQueryClient();

  const { data: invitations, isLoading, refetch } = useQuery({
    queryKey: ['student-event-invitations', eventId, studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_invitations')
        .select('*')
        .eq('event_id', eventId)
        .eq('inviting_student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as StudentInvitation[];
    },
    enabled: !!eventId && !!studentId,
  });

  const deleteInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('event_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar ambos os caches
      queryClient.invalidateQueries({ 
        queryKey: ['student-event-invitations', eventId, studentId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['student-invitations-count', eventId, studentId] 
      });
      
      toast({
        title: 'Convite Removido',
        description: 'O convite foi deletado com sucesso. Você pode convidar outro amigo agora.',
      });
    },
    onError: (error) => {
      console.error('Erro ao deletar convite:', error);
      toast({
        title: 'Erro ao Deletar',
        description: 'Não foi possível remover o convite. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return {
    invitations: invitations || [],
    isLoading,
    deleteInvitation: deleteInvitation.mutate,
    isDeletingInvitation: deleteInvitation.isPending,
    refetch,
  };
}

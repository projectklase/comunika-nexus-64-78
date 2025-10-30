import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function usePostRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const recordRead = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase.from('post_reads').insert({
        post_id: postId,
        user_id: user.id,
      });
      
      // Ignora erro de unique violation (post já foi lido)
      if (error && error.code !== '23505') {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalida queries de desafios para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['student_challenges'] });
    },
    onError: (error: any) => {
      console.error('Erro ao registrar leitura:', error);
    }
  });

  return { recordRead: recordRead.mutate };
}

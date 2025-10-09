-- Add DELETE policy for notifications so users can delete their own notifications
CREATE POLICY "Usuários podem deletar suas próprias notificações"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);
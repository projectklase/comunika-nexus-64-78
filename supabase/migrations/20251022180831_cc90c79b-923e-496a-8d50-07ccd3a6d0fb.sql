-- Fix notifications RLS policy to allow secretaria/professor to create notifications for ANY user
DROP POLICY IF EXISTS "Secretaria e professores podem criar notificações para qualqu" ON public.notifications;

CREATE POLICY "Secretaria e professores podem criar notificações para outros usuários"
ON public.notifications
FOR INSERT
WITH CHECK (
  can_create_notifications(auth.uid())
  OR auth.uid() = user_id
);
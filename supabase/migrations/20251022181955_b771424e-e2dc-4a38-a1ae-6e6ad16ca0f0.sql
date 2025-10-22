-- Fix RLS policy to allow secretaria/professor to create notifications for ANY user
DROP POLICY IF EXISTS "Allow secretaria and professor to create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Secretaria e professores podem criar notificações para outros usuários" ON public.notifications;

CREATE POLICY "Creators can create notifications for any user"
ON public.notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('secretaria'::app_role, 'professor'::app_role)
  )
  OR auth.uid() = user_id
);
-- Simplify notifications INSERT policy to be more explicit
DROP POLICY IF EXISTS "Secretaria e professores podem criar notificações para outros usuários" ON public.notifications;

CREATE POLICY "Allow secretaria and professor to create notifications"
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
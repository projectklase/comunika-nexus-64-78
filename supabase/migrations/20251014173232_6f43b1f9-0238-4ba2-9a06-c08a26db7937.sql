-- Remove a política antiga que não está funcionando
DROP POLICY IF EXISTS "Sistema pode criar notificações" ON public.notifications;

-- Cria nova política que permite secretaria criar notificações para qualquer usuário
CREATE POLICY "Secretaria e sistema podem criar notificações" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  -- Secretaria pode criar notificações para qualquer usuário
  has_role(auth.uid(), 'secretaria'::app_role) 
  OR 
  -- Professores podem criar notificações para seus alunos
  has_role(auth.uid(), 'professor'::app_role)
  OR
  -- Qualquer usuário pode criar notificações para si mesmo
  auth.uid() = user_id
  OR
  -- Service role pode criar notificações (para edge functions)
  auth.role() = 'service_role'
);
-- Criar função SECURITY DEFINER para verificar permissões de criação de notificações
CREATE OR REPLACE FUNCTION public.can_create_notifications(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('secretaria'::app_role, 'professor'::app_role)
  )
$$;

-- Dropar política atual de INSERT
DROP POLICY IF EXISTS "Usuários autorizados podem criar notificações" ON public.notifications;

-- Criar nova política de INSERT simplificada
CREATE POLICY "Secretaria e professores podem criar notificações para qualquer usuário"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  can_create_notifications(auth.uid()) OR (auth.uid() = user_id)
);

-- Criar índice para melhorar performance da função (se não existir)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON public.user_roles(user_id, role);
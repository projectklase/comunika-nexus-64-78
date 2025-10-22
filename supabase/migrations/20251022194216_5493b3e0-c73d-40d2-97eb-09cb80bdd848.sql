-- Garantir que a política RLS permite criar notificações para outros usuários
-- Remover todas as políticas antigas de INSERT
DROP POLICY IF EXISTS "Creators can create notifications for any user" ON public.notifications;
DROP POLICY IF EXISTS "Allow secretaria and professor to create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Secretaria e professores podem criar notificações para outros usuários" ON public.notifications;
DROP POLICY IF EXISTS "Secretaria e professores podem criar notificações" ON public.notifications;

-- Criar política clara e funcional usando has_role
CREATE POLICY "Users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Secretaria e professores podem criar notificações para qualquer usuário
  has_role(auth.uid(), 'secretaria'::app_role) 
  OR has_role(auth.uid(), 'professor'::app_role)
  -- Ou o usuário está criando notificação para si mesmo
  OR auth.uid() = user_id
);

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at 
ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read 
ON public.notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_role_target 
ON public.notifications(role_target);

-- Adicionar índice na tabela user_roles para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_roles_role 
ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
ON public.user_roles(user_id, role);
-- Corrigir política RLS para permitir secretaria e professor criarem notificações para qualquer usuário
-- O problema era que a política não estava usando a função has_role() com SECURITY DEFINER

DROP POLICY IF EXISTS "Creators can create notifications for any user" ON public.notifications;
DROP POLICY IF EXISTS "Allow secretaria and professor to create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Secretaria e professores podem criar notificações para outros usuários" ON public.notifications;

-- Criar nova política usando a função has_role que tem SECURITY DEFINER
CREATE POLICY "Secretaria e professores podem criar notificações"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Secretaria e professores podem criar notificações para qualquer usuário
  has_role(auth.uid(), 'secretaria'::app_role) 
  OR has_role(auth.uid(), 'professor'::app_role)
  -- Ou o usuário está criando notificação para si mesmo
  OR auth.uid() = user_id
);
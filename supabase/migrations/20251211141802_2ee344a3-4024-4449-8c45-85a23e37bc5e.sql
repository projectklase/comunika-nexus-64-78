-- =============================================
-- CORREÇÃO RLS: admin_subscriptions - Restringir acesso por admin_id
-- =============================================

-- 1. Remover política permissiva que permite qualquer admin ver TODAS assinaturas
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.admin_subscriptions;

-- 2. Criar política restritiva: Admin pode gerenciar APENAS sua própria assinatura
CREATE POLICY "Admin pode gerenciar sua própria assinatura"
ON public.admin_subscriptions
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND admin_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND admin_id = auth.uid()
);

-- Políticas mantidas (já corretas):
-- "Superadmins can manage all subscriptions" - Acesso total para gestão da plataforma
-- "Users can view their own subscription" - Backup para leitura própria
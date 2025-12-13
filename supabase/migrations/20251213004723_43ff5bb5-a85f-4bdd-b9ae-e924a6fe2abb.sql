-- Permitir que usuários não autenticados vejam planos ativos
-- Necessário para a página de registro self-service
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
TO anon
USING (is_active = true);
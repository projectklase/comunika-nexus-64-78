-- =============================================
-- CORREÇÃO RLS: feature_flags - Restringir acesso anônimo
-- =============================================

-- 1. Remover política de acesso anônimo total
DROP POLICY IF EXISTS "Anonymous users can read feature flags" ON public.feature_flags;

-- 2. Remover política duplicada "Todos podem ver feature flags"
DROP POLICY IF EXISTS "Todos podem ver feature flags" ON public.feature_flags;

-- 3. Criar política anônima restrita (apenas flags públicos necessários para login)
CREATE POLICY "Anonymous pode ler apenas flags públicos"
ON public.feature_flags
FOR SELECT
TO anon
USING (key IN ('quick_logins_visible', 'maintenance_mode'));

-- Nota: A política "Authenticated users can read feature flags" já existe e permite
-- usuários logados lerem todos os flags, então não precisa ser modificada.
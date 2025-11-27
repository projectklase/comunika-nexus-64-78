-- ========================================
-- FASE 1: Criar Tabela de Planos de Assinatura
-- ========================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL,
  max_students INTEGER NOT NULL,
  included_schools INTEGER NOT NULL DEFAULT 1,
  addon_school_price_cents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies para subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view active plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage plans"
ON public.subscription_plans
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- ========================================
-- FASE 2: Criar Tabela de Assinaturas de Admin
-- ========================================

CREATE TABLE IF NOT EXISTS public.admin_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  addon_schools_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(admin_id)
);

-- RLS Policies para admin_subscriptions
ALTER TABLE public.admin_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.admin_subscriptions;
CREATE POLICY "Users can view their own subscription"
ON public.admin_subscriptions
FOR SELECT
TO authenticated
USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.admin_subscriptions;
CREATE POLICY "Admins can manage subscriptions"
ON public.admin_subscriptions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- ========================================
-- FASE 3: Inserir Planos Padrão
-- ========================================

INSERT INTO public.subscription_plans (name, slug, price_cents, max_students, included_schools, addon_school_price_cents, features)
VALUES
  (
    'Básico',
    'basico',
    35990,
    300,
    1,
    9990,
    '["Dashboard Completo", "Gestão de Alunos", "Gestão de Turmas", "Sistema de Postagens", "Calendário Escolar", "Histórico de Auditoria"]'::jsonb
  ),
  (
    'Intermediário',
    'intermediario',
    59990,
    600,
    2,
    9990,
    '["Tudo do Básico", "Sistema de Gamificação", "Rankings", "Desafios", "Recompensas", "Insights Preditivos com IA"]'::jsonb
  ),
  (
    'Avançado',
    'avancado',
    89990,
    1200,
    3,
    9990,
    '["Tudo do Intermediário", "Relatórios Avançados", "Exportação Completa", "API de Integração", "Suporte Prioritário"]'::jsonb
  ),
  (
    'Enterprise',
    'enterprise',
    149990,
    999999,
    999,
    0,
    '["Tudo do Avançado", "Escolas Ilimitadas", "Alunos Ilimitados", "White Label", "Suporte Dedicado", "SLA Garantido"]'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- FASE 4: Atribuir Licença Intermediário ao Admin Klase
-- ========================================

INSERT INTO public.admin_subscriptions (admin_id, plan_id, status, addon_schools_count, started_at)
SELECT
  'f905cbb2-30ea-45ae-be68-b85f4f6180d9'::uuid,
  sp.id,
  'active',
  0,
  now()
FROM public.subscription_plans sp
WHERE sp.slug = 'intermediario'
ON CONFLICT (admin_id) DO UPDATE
SET
  plan_id = EXCLUDED.plan_id,
  status = 'active',
  addon_schools_count = 0,
  updated_at = now();

-- ========================================
-- FASE 5: Corrigir RLS Policies da Tabela Schools
-- ========================================

-- Dropar TODAS as policies existentes da tabela schools
DROP POLICY IF EXISTS "Admins can manage their schools" ON public.schools;
DROP POLICY IF EXISTS "Admins and Secretaria can manage schools" ON public.schools;
DROP POLICY IF EXISTS "Users can view schools from their school" ON public.schools;
DROP POLICY IF EXISTS "Users can view schools they belong to" ON public.schools;
DROP POLICY IF EXISTS "Admins can create schools" ON public.schools;
DROP POLICY IF EXISTS "Admins can update their schools" ON public.schools;
DROP POLICY IF EXISTS "Admins can delete their schools" ON public.schools;

-- Criar policies novas e corretas

-- Policy para INSERT: permite admin criar sem membership prévia
CREATE POLICY "Admins can create schools"
ON public.schools
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Policy para SELECT: usuários veem escolas onde têm membership
CREATE POLICY "Users can view schools they belong to"
ON public.schools
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_memberships
    WHERE school_memberships.school_id = schools.id
    AND school_memberships.user_id = auth.uid()
  )
);

-- Policy para UPDATE: admin + membership
CREATE POLICY "Admins can update their schools"
ON public.schools
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_memberships
    WHERE school_memberships.school_id = schools.id
    AND school_memberships.user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'administrador'::app_role)
)
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Policy para DELETE: admin + membership
CREATE POLICY "Admins can delete their schools"
ON public.schools
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_memberships
    WHERE school_memberships.school_id = schools.id
    AND school_memberships.user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'administrador'::app_role)
);

-- ========================================
-- FASE 6: Criar RPC para Verificar Limites de Assinatura
-- ========================================

CREATE OR REPLACE FUNCTION public.check_subscription_limits(p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_plan RECORD;
  v_current_students INT;
  v_current_schools INT;
  v_max_students INT;
  v_max_schools INT;
  v_can_add_students BOOLEAN;
  v_can_add_schools BOOLEAN;
BEGIN
  -- Verificar role de administrador
  IF NOT has_role(p_admin_id, 'administrador'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores possuem assinaturas';
  END IF;

  -- Buscar assinatura ativa do admin
  SELECT * INTO v_subscription
  FROM admin_subscriptions
  WHERE admin_id = p_admin_id
  AND status = 'active';

  -- Se não tem assinatura, retornar limites zerados
  IF v_subscription IS NULL THEN
    RETURN jsonb_build_object(
      'has_subscription', false,
      'current_students', 0,
      'max_students', 0,
      'current_schools', 0,
      'max_schools', 0,
      'can_add_students', false,
      'can_add_schools', false,
      'message', 'Nenhuma assinatura ativa encontrada'
    );
  END IF;

  -- Buscar informações do plano
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = v_subscription.plan_id;

  -- Calcular limites
  v_max_students := v_plan.max_students;
  v_max_schools := v_plan.included_schools + v_subscription.addon_schools_count;

  -- Contar alunos atuais nas escolas do admin
  SELECT COUNT(DISTINCT p.id) INTO v_current_students
  FROM profiles p
  INNER JOIN school_memberships sm ON sm.user_id = p.id
  INNER JOIN school_memberships admin_sm ON admin_sm.school_id = sm.school_id
  WHERE admin_sm.user_id = p_admin_id
  AND admin_sm.role = 'administrador'
  AND sm.role = 'aluno'
  AND p.is_active = true;

  -- Contar escolas atuais do admin
  SELECT COUNT(DISTINCT sm.school_id) INTO v_current_schools
  FROM school_memberships sm
  WHERE sm.user_id = p_admin_id
  AND sm.role = 'administrador';

  -- Verificar se pode adicionar
  v_can_add_students := v_current_students < v_max_students;
  v_can_add_schools := v_current_schools < v_max_schools;

  -- Retornar resultados
  RETURN jsonb_build_object(
    'has_subscription', true,
    'plan_name', v_plan.name,
    'plan_slug', v_plan.slug,
    'current_students', v_current_students,
    'max_students', v_max_students,
    'current_schools', v_current_schools,
    'max_schools', v_max_schools,
    'can_add_students', v_can_add_students,
    'can_add_schools', v_can_add_schools,
    'addon_school_price_cents', v_plan.addon_school_price_cents,
    'students_remaining', v_max_students - v_current_students,
    'schools_remaining', v_max_schools - v_current_schools
  );
END;
$$;

-- ========================================
-- FASE 7: Criar RPC para Validar Criação de Aluno
-- ========================================

CREATE OR REPLACE FUNCTION public.validate_student_creation(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_limits JSONB;
BEGIN
  -- Buscar admin da escola
  SELECT user_id INTO v_admin_id
  FROM school_memberships
  WHERE school_id = p_school_id
  AND role = 'administrador'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_create', false,
      'message', 'Administrador da escola não encontrado'
    );
  END IF;

  -- Verificar limites
  v_limits := check_subscription_limits(v_admin_id);

  IF NOT (v_limits->>'can_add_students')::boolean THEN
    RETURN jsonb_build_object(
      'can_create', false,
      'message', format(
        'Limite de %s alunos atingido. Faça upgrade do plano para adicionar mais alunos.',
        v_limits->>'max_students'
      ),
      'current_students', v_limits->'current_students',
      'max_students', v_limits->'max_students'
    );
  END IF;

  RETURN jsonb_build_object(
    'can_create', true,
    'message', 'Você pode adicionar mais alunos',
    'students_remaining', v_limits->'students_remaining'
  );
END;
$$;
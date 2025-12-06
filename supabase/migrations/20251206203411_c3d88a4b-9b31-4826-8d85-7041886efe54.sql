-- PARTE 2: Funções, tabela e RLS policies para superadmin

-- 1. Criar função is_superadmin() com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid DEFAULT auth.uid())
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
      AND role = 'superadmin'::app_role
  )
$$;

-- 2. Criar tabela platform_audit_logs para ações de superadmin
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas superadmins podem ver e inserir logs
CREATE POLICY "Superadmins can view platform audit logs"
ON public.platform_audit_logs
FOR SELECT
USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can insert platform audit logs"
ON public.platform_audit_logs
FOR INSERT
WITH CHECK (is_superadmin(auth.uid()));

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_superadmin 
ON public.platform_audit_logs(superadmin_id);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created 
ON public.platform_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_entity 
ON public.platform_audit_logs(entity_type, entity_id);

-- 4. RLS Policies para acesso global do superadmin em tabelas críticas

-- profiles: superadmin pode ver todos os perfis
CREATE POLICY "Superadmins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_superadmin(auth.uid()));

-- profiles: superadmin pode atualizar todos os perfis
CREATE POLICY "Superadmins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_superadmin(auth.uid()));

-- schools: superadmin pode gerenciar todas as escolas
CREATE POLICY "Superadmins can manage all schools"
ON public.schools
FOR ALL
USING (is_superadmin(auth.uid()));

-- admin_subscriptions: superadmin pode gerenciar todas as assinaturas
CREATE POLICY "Superadmins can manage all subscriptions"
ON public.admin_subscriptions
FOR ALL
USING (is_superadmin(auth.uid()));

-- school_memberships: superadmin pode ver todos os memberships
CREATE POLICY "Superadmins can view all school memberships"
ON public.school_memberships
FOR SELECT
USING (is_superadmin(auth.uid()));

-- user_roles: superadmin pode gerenciar todos os roles
CREATE POLICY "Superadmins can manage all user roles"
ON public.user_roles
FOR ALL
USING (is_superadmin(auth.uid()));

-- login_history: superadmin pode ver todo histórico de login
CREATE POLICY "Superadmins can view all login history"
ON public.login_history
FOR SELECT
USING (is_superadmin(auth.uid()));

-- audit_events: superadmin pode ver todos os eventos de auditoria
CREATE POLICY "Superadmins can view all audit events"
ON public.audit_events
FOR SELECT
USING (is_superadmin(auth.uid()));

-- 5. Função para registrar ações de superadmin
CREATE OR REPLACE FUNCTION public.log_superadmin_action(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_entity_label text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Verificar se é superadmin
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem registrar ações de plataforma';
  END IF;

  INSERT INTO platform_audit_logs (
    superadmin_id,
    action,
    entity_type,
    entity_id,
    entity_label,
    details
  ) VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_label,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- 6. Função RPC para obter métricas globais (superadmin only)
CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem acessar métricas da plataforma';
  END IF;

  SELECT jsonb_build_object(
    'total_schools', (SELECT COUNT(*) FROM schools),
    'active_schools', (SELECT COUNT(*) FROM schools WHERE is_active = true),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_admins', (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role = 'administrador'),
    'total_teachers', (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role = 'professor'),
    'total_secretarias', (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role = 'secretaria'),
    'total_students', (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role = 'aluno'),
    'total_subscriptions', (SELECT COUNT(*) FROM admin_subscriptions),
    'active_subscriptions', (SELECT COUNT(*) FROM admin_subscriptions WHERE status = 'active'),
    'logins_today', (SELECT COUNT(*) FROM login_history WHERE logged_at >= CURRENT_DATE),
    'logins_this_week', (SELECT COUNT(*) FROM login_history WHERE logged_at >= CURRENT_DATE - INTERVAL '7 days'),
    'generated_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;
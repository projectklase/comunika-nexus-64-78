-- Add discount fields to admin_subscriptions (if not exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_subscriptions' AND column_name = 'discount_percent') THEN
    ALTER TABLE admin_subscriptions ADD COLUMN discount_percent integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_subscriptions' AND column_name = 'discount_cents') THEN
    ALTER TABLE admin_subscriptions ADD COLUMN discount_cents integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_subscriptions' AND column_name = 'discount_reason') THEN
    ALTER TABLE admin_subscriptions ADD COLUMN discount_reason text DEFAULT NULL;
  END IF;
END $$;

-- Add constraints (drop first if exist)
ALTER TABLE admin_subscriptions DROP CONSTRAINT IF EXISTS discount_percent_range;
ALTER TABLE admin_subscriptions DROP CONSTRAINT IF EXISTS discount_cents_positive;
ALTER TABLE admin_subscriptions ADD CONSTRAINT discount_percent_range CHECK (discount_percent >= 0 AND discount_percent <= 100);
ALTER TABLE admin_subscriptions ADD CONSTRAINT discount_cents_positive CHECK (discount_cents >= 0);

-- Drop and recreate functions
DROP FUNCTION IF EXISTS get_platform_metrics();
DROP FUNCTION IF EXISTS get_schools_overview();
DROP FUNCTION IF EXISTS get_admins_overview();
DROP FUNCTION IF EXISTS update_subscription_admin(uuid, uuid, text, integer, timestamp with time zone, timestamp with time zone);

-- Recreate update_subscription_admin with discount params
CREATE OR REPLACE FUNCTION update_subscription_admin(
  p_admin_id uuid,
  p_plan_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_addon_schools_count integer DEFAULT NULL,
  p_trial_ends_at timestamp with time zone DEFAULT NULL,
  p_expires_at timestamp with time zone DEFAULT NULL,
  p_discount_percent integer DEFAULT NULL,
  p_discount_cents integer DEFAULT NULL,
  p_discount_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_subscription_id uuid;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas superadmins podem gerenciar assinaturas';
  END IF;

  SELECT id INTO v_subscription_id FROM admin_subscriptions WHERE admin_id = p_admin_id;

  IF v_subscription_id IS NULL THEN
    INSERT INTO admin_subscriptions (admin_id, plan_id, status, addon_schools_count, trial_ends_at, expires_at, discount_percent, discount_cents, discount_reason)
    VALUES (
      p_admin_id,
      COALESCE(p_plan_id, (SELECT id FROM subscription_plans WHERE is_active = true ORDER BY price_cents LIMIT 1)),
      COALESCE(p_status, 'active'),
      COALESCE(p_addon_schools_count, 0),
      p_trial_ends_at, p_expires_at,
      COALESCE(p_discount_percent, 0),
      COALESCE(p_discount_cents, 0),
      p_discount_reason
    );
  ELSE
    UPDATE admin_subscriptions SET
      plan_id = COALESCE(p_plan_id, plan_id),
      status = COALESCE(p_status, status),
      addon_schools_count = COALESCE(p_addon_schools_count, addon_schools_count),
      trial_ends_at = CASE WHEN p_trial_ends_at IS NULL THEN trial_ends_at ELSE p_trial_ends_at END,
      expires_at = CASE WHEN p_expires_at IS NULL THEN expires_at ELSE p_expires_at END,
      discount_percent = COALESCE(p_discount_percent, discount_percent),
      discount_cents = COALESCE(p_discount_cents, discount_cents),
      discount_reason = COALESCE(p_discount_reason, discount_reason),
      updated_at = now()
    WHERE id = v_subscription_id;
  END IF;

  INSERT INTO platform_audit_logs (superadmin_id, action, entity_type, entity_id, entity_label, details)
  VALUES (
    auth.uid(),
    CASE WHEN v_subscription_id IS NULL THEN 'CREATE_SUBSCRIPTION' ELSE 'UPDATE_SUBSCRIPTION' END,
    'subscription',
    COALESCE(v_subscription_id::text, p_admin_id::text),
    (SELECT name FROM profiles WHERE id = p_admin_id),
    jsonb_build_object('plan_id', p_plan_id, 'status', p_status, 'addon_schools_count', p_addon_schools_count, 'discount_percent', p_discount_percent, 'discount_cents', p_discount_cents, 'discount_reason', p_discount_reason)
  );
END;
$$;

-- Recreate get_platform_metrics with discount calculation
CREATE FUNCTION get_platform_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_total_schools integer;
  v_active_schools integer;
  v_total_users integer;
  v_total_admins integer;
  v_total_teachers integer;
  v_total_secretarias integer;
  v_total_students integer;
  v_total_subscriptions integer;
  v_active_subscriptions integer;
  v_mrr_cents bigint;
  v_arpu_cents integer;
  v_logins_today integer;
  v_logins_this_week integer;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas superadmins podem acessar métricas da plataforma';
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true) INTO v_total_schools, v_active_schools FROM schools;

  SELECT 
    COUNT(DISTINCT p.id),
    COUNT(DISTINCT CASE WHEN ur.role = 'administrador' THEN p.id END),
    COUNT(DISTINCT CASE WHEN ur.role = 'professor' THEN p.id END),
    COUNT(DISTINCT CASE WHEN ur.role = 'secretaria' THEN p.id END),
    COUNT(DISTINCT CASE WHEN ur.role = 'aluno' THEN p.id END)
  INTO v_total_users, v_total_admins, v_total_teachers, v_total_secretarias, v_total_students
  FROM profiles p LEFT JOIN user_roles ur ON p.id = ur.user_id;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'active') INTO v_total_subscriptions, v_active_subscriptions FROM admin_subscriptions;

  -- MRR with discounts: base + addons - percentage discount - fixed discount
  SELECT COALESCE(SUM(
    CASE WHEN asub.status = 'active' THEN
      GREATEST(0,
        (sp.price_cents + 
          (GREATEST(0, (SELECT COUNT(*) FROM school_memberships sm WHERE sm.user_id = asub.admin_id AND sm.role = 'administrador') - sp.included_schools) * sp.addon_school_price_cents)
        ) * (100 - COALESCE(asub.discount_percent, 0)) / 100
        - COALESCE(asub.discount_cents, 0)
      )
    ELSE 0 END
  ), 0) INTO v_mrr_cents
  FROM admin_subscriptions asub JOIN subscription_plans sp ON asub.plan_id = sp.id;

  v_arpu_cents := CASE WHEN v_active_subscriptions > 0 THEN v_mrr_cents / v_active_subscriptions ELSE 0 END;

  SELECT 
    COUNT(*) FILTER (WHERE logged_at >= CURRENT_DATE),
    COUNT(*) FILTER (WHERE logged_at >= CURRENT_DATE - INTERVAL '7 days')
  INTO v_logins_today, v_logins_this_week FROM login_history;

  v_result := jsonb_build_object(
    'total_schools', v_total_schools, 'active_schools', v_active_schools,
    'total_users', v_total_users, 'total_admins', v_total_admins,
    'total_teachers', v_total_teachers, 'total_secretarias', v_total_secretarias,
    'total_students', v_total_students, 'total_subscriptions', v_total_subscriptions,
    'active_subscriptions', v_active_subscriptions, 'mrr_cents', v_mrr_cents,
    'mrr_growth_pct', 0, 'arpu_cents', v_arpu_cents,
    'logins_today', v_logins_today, 'logins_this_week', v_logins_this_week,
    'generated_at', now()
  );
  RETURN v_result;
END;
$$;

-- Recreate get_schools_overview with discount info
CREATE FUNCTION get_schools_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas superadmins podem acessar visão geral das escolas';
  END IF;

  SELECT jsonb_agg(school_data ORDER BY admin_name NULLS LAST, school_order) INTO v_result
  FROM (
    SELECT 
      s.id, s.name, s.slug, s.is_active, s.logo_url, s.primary_color, s.created_at,
      (SELECT COUNT(*) FROM school_memberships WHERE school_id = s.id) as total_users,
      (SELECT COUNT(*) FROM school_memberships WHERE school_id = s.id AND role = 'aluno') as total_students,
      (SELECT COUNT(*) FROM school_memberships WHERE school_id = s.id AND role = 'professor') as total_teachers,
      sm.user_id as admin_id, p.name as admin_name, p.email as admin_email,
      ROW_NUMBER() OVER (PARTITION BY sm.user_id ORDER BY s.created_at) as school_order,
      CASE WHEN ROW_NUMBER() OVER (PARTITION BY sm.user_id ORDER BY s.created_at) > COALESCE(sp.included_schools, 1) THEN true ELSE false END as is_addon_school,
      CASE WHEN asub.id IS NOT NULL THEN
        jsonb_build_object(
          'id', asub.id, 'status', asub.status, 'plan_name', sp.name, 'plan_slug', sp.slug,
          'price_cents', sp.price_cents, 'addon_school_price_cents', sp.addon_school_price_cents,
          'max_students', sp.max_students, 'included_schools', sp.included_schools,
          'addon_schools_count', GREATEST(0, (SELECT COUNT(*) FROM school_memberships sm2 WHERE sm2.user_id = asub.admin_id AND sm2.role = 'administrador') - sp.included_schools),
          'started_at', asub.started_at, 'expires_at', asub.expires_at, 'trial_ends_at', asub.trial_ends_at,
          'discount_percent', COALESCE(asub.discount_percent, 0),
          'discount_cents', COALESCE(asub.discount_cents, 0),
          'discount_reason', asub.discount_reason
        )
      ELSE NULL END as subscription
    FROM schools s
    LEFT JOIN school_memberships sm ON s.id = sm.school_id AND sm.role = 'administrador'
    LEFT JOIN profiles p ON sm.user_id = p.id
    LEFT JOIN admin_subscriptions asub ON sm.user_id = asub.admin_id
    LEFT JOIN subscription_plans sp ON asub.plan_id = sp.id
  ) school_data;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Recreate get_admins_overview with discount info
CREATE FUNCTION get_admins_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas superadmins podem acessar visão geral dos admins';
  END IF;

  SELECT jsonb_agg(admin_data ORDER BY name) INTO v_result
  FROM (
    SELECT 
      p.id, p.name, p.email, p.phone, p.avatar, p.created_at, p.is_active,
      (SELECT COUNT(*) FROM school_memberships WHERE user_id = p.id AND role = 'administrador') as schools_count,
      (SELECT COALESCE(SUM((SELECT COUNT(*) FROM school_memberships sm2 WHERE sm2.school_id = sm.school_id AND sm2.role = 'aluno')), 0) FROM school_memberships sm WHERE sm.user_id = p.id AND sm.role = 'administrador') as total_students,
      CASE WHEN asub.id IS NOT NULL THEN
        jsonb_build_object(
          'id', asub.id, 'status', asub.status, 'plan_name', sp.name, 'plan_slug', sp.slug,
          'price_cents', sp.price_cents, 'max_students', sp.max_students, 'included_schools', sp.included_schools,
          'addon_schools', asub.addon_schools_count,
          'started_at', asub.started_at, 'expires_at', asub.expires_at, 'trial_ends_at', asub.trial_ends_at,
          'discount_percent', COALESCE(asub.discount_percent, 0),
          'discount_cents', COALESCE(asub.discount_cents, 0),
          'discount_reason', asub.discount_reason
        )
      ELSE NULL END as subscription
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id AND ur.role = 'administrador'
    LEFT JOIN admin_subscriptions asub ON p.id = asub.admin_id
    LEFT JOIN subscription_plans sp ON asub.plan_id = sp.id
  ) admin_data;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
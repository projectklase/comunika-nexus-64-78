
-- RPC: Get schools overview with subscription and user count details
CREATE OR REPLACE FUNCTION public.get_schools_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem acessar visão geral de escolas';
  END IF;

  SELECT COALESCE(jsonb_agg(school_data ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      s.id,
      s.name,
      s.slug,
      s.is_active,
      s.logo_url,
      s.primary_color,
      s.created_at,
      (SELECT COUNT(*) FROM school_memberships sm WHERE sm.school_id = s.id) as total_users,
      (SELECT COUNT(*) FROM school_memberships sm WHERE sm.school_id = s.id AND sm.role = 'aluno') as total_students,
      (SELECT COUNT(*) FROM school_memberships sm WHERE sm.school_id = s.id AND sm.role = 'professor') as total_teachers,
      (
        SELECT jsonb_build_object(
          'id', sub.id,
          'status', sub.status,
          'plan_name', sp.name,
          'plan_slug', sp.slug,
          'price_cents', sp.price_cents,
          'max_students', sp.max_students,
          'included_schools', sp.included_schools,
          'addon_schools', sub.addon_schools_count,
          'started_at', sub.started_at,
          'expires_at', sub.expires_at,
          'trial_ends_at', sub.trial_ends_at
        )
        FROM admin_subscriptions sub
        JOIN subscription_plans sp ON sp.id = sub.plan_id
        JOIN school_memberships adm ON adm.user_id = sub.admin_id AND adm.school_id = s.id AND adm.role = 'administrador'
        WHERE sub.status = 'active'
        LIMIT 1
      ) as subscription
    FROM schools s
  ) school_data;

  RETURN v_result;
END;
$$;

-- RPC: Get MRR history (last 12 months)
CREATE OR REPLACE FUNCTION public.get_mrr_history()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem acessar histórico de MRR';
  END IF;

  SELECT COALESCE(jsonb_agg(month_data ORDER BY month_date), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      date_trunc('month', m.month_date)::date as month_date,
      COALESCE(SUM(
        CASE 
          WHEN sub.status = 'active' AND sub.started_at <= m.month_date 
            AND (sub.expires_at IS NULL OR sub.expires_at > m.month_date)
          THEN sp.price_cents + (sub.addon_schools_count * sp.addon_school_price_cents)
          ELSE 0
        END
      ), 0) as mrr_cents
    FROM (
      SELECT generate_series(
        date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
      ) as month_date
    ) m
    LEFT JOIN admin_subscriptions sub ON sub.started_at <= m.month_date + INTERVAL '1 month'
    LEFT JOIN subscription_plans sp ON sp.id = sub.plan_id
    GROUP BY m.month_date
  ) month_data;

  RETURN v_result;
END;
$$;

-- RPC: Get user growth (new users per month, last 12 months)
CREATE OR REPLACE FUNCTION public.get_user_growth()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem acessar crescimento de usuários';
  END IF;

  SELECT COALESCE(jsonb_agg(month_data ORDER BY month_date), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      date_trunc('month', m.month_date)::date as month_date,
      COALESCE((
        SELECT COUNT(*) FROM profiles p 
        WHERE date_trunc('month', p.created_at) = m.month_date
      ), 0) as new_users,
      COALESCE((
        SELECT COUNT(*) FROM schools s 
        WHERE date_trunc('month', s.created_at) = m.month_date
      ), 0) as new_schools
    FROM (
      SELECT generate_series(
        date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
      ) as month_date
    ) m
  ) month_data;

  RETURN v_result;
END;
$$;

-- RPC: Get plan distribution
CREATE OR REPLACE FUNCTION public.get_plan_distribution()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem acessar distribuição de planos';
  END IF;

  SELECT COALESCE(jsonb_agg(plan_data), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      sp.name as plan_name,
      sp.slug as plan_slug,
      COUNT(sub.id) as subscribers
    FROM subscription_plans sp
    LEFT JOIN admin_subscriptions sub ON sub.plan_id = sp.id AND sub.status = 'active'
    WHERE sp.is_active = true
    GROUP BY sp.id, sp.name, sp.slug
    ORDER BY subscribers DESC
  ) plan_data;

  RETURN v_result;
END;
$$;

-- RPC: Get daily logins (last 30 days)
CREATE OR REPLACE FUNCTION public.get_daily_logins()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem acessar logins diários';
  END IF;

  SELECT COALESCE(jsonb_agg(day_data ORDER BY login_date), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      d.day::date as login_date,
      COALESCE((
        SELECT COUNT(*) FROM login_history lh 
        WHERE lh.logged_at::date = d.day::date
      ), 0) as logins
    FROM (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '29 days',
        CURRENT_DATE,
        '1 day'::interval
      ) as day
    ) d
  ) day_data;

  RETURN v_result;
END;
$$;

-- Update get_platform_metrics to include MRR
CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_mrr_cents INTEGER;
  v_prev_mrr_cents INTEGER;
  v_growth_pct NUMERIC;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem acessar métricas da plataforma';
  END IF;

  -- Calculate current MRR
  SELECT COALESCE(SUM(
    sp.price_cents + (sub.addon_schools_count * sp.addon_school_price_cents)
  ), 0)
  INTO v_mrr_cents
  FROM admin_subscriptions sub
  JOIN subscription_plans sp ON sp.id = sub.plan_id
  WHERE sub.status = 'active';

  -- Calculate previous month MRR (for growth calculation)
  SELECT COALESCE(SUM(
    sp.price_cents + (sub.addon_schools_count * sp.addon_school_price_cents)
  ), 0)
  INTO v_prev_mrr_cents
  FROM admin_subscriptions sub
  JOIN subscription_plans sp ON sp.id = sub.plan_id
  WHERE sub.status = 'active'
    AND sub.started_at < date_trunc('month', CURRENT_DATE);

  -- Calculate growth percentage
  IF v_prev_mrr_cents > 0 THEN
    v_growth_pct := ROUND(((v_mrr_cents - v_prev_mrr_cents)::NUMERIC / v_prev_mrr_cents) * 100, 1);
  ELSE
    v_growth_pct := 0;
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
    'mrr_cents', v_mrr_cents,
    'mrr_growth_pct', v_growth_pct,
    'arpu_cents', CASE 
      WHEN (SELECT COUNT(*) FROM admin_subscriptions WHERE status = 'active') > 0 
      THEN v_mrr_cents / (SELECT COUNT(*) FROM admin_subscriptions WHERE status = 'active')
      ELSE 0
    END,
    'logins_today', (SELECT COUNT(*) FROM login_history WHERE logged_at >= CURRENT_DATE),
    'logins_this_week', (SELECT COUNT(*) FROM login_history WHERE logged_at >= CURRENT_DATE - INTERVAL '7 days'),
    'generated_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

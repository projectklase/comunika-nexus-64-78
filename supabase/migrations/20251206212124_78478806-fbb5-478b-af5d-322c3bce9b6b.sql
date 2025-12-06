-- Platform alerts table
CREATE TABLE IF NOT EXISTS public.platform_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'SUBSCRIPTION_EXPIRING', 'LOW_ENGAGEMENT', 'PAYMENT_FAILED', 
    'HIGH_CHURN_RISK', 'INACTIVE_SCHOOL', 'USAGE_SPIKE'
  )),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_label TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage alerts"
  ON public.platform_alerts FOR ALL
  USING (public.is_superadmin(auth.uid()));

-- RPC: Get advanced financial metrics
CREATE OR REPLACE FUNCTION public.get_financial_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_mrr NUMERIC := 0;
  v_arr NUMERIC := 0;
  v_arpu NUMERIC := 0;
  v_total_customers INT := 0;
  v_active_subscriptions INT := 0;
  v_churned_last_month INT := 0;
  v_churn_rate NUMERIC := 0;
  v_ltv NUMERIC := 0;
  v_mrr_growth NUMERIC := 0;
  v_prev_mrr NUMERIC := 0;
BEGIN
  IF NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Current MRR from active subscriptions
  SELECT COALESCE(SUM(
    sp.price_cents + (sub.addon_schools_count * sp.addon_school_price_cents)
  ), 0) / 100.0
  INTO v_mrr
  FROM admin_subscriptions sub
  JOIN subscription_plans sp ON sp.id = sub.plan_id
  WHERE sub.status = 'active';

  -- ARR = MRR * 12
  v_arr := v_mrr * 12;

  -- Active subscriptions count
  SELECT COUNT(*) INTO v_active_subscriptions
  FROM admin_subscriptions WHERE status = 'active';

  -- Total unique customers
  SELECT COUNT(DISTINCT admin_id) INTO v_total_customers
  FROM admin_subscriptions;

  -- ARPU = MRR / Active Subscriptions
  IF v_active_subscriptions > 0 THEN
    v_arpu := v_mrr / v_active_subscriptions;
  END IF;

  -- Churned last 30 days
  SELECT COUNT(*) INTO v_churned_last_month
  FROM admin_subscriptions
  WHERE status = 'canceled'
    AND updated_at >= NOW() - INTERVAL '30 days';

  -- Churn Rate = Churned / Total at start of period
  IF v_active_subscriptions + v_churned_last_month > 0 THEN
    v_churn_rate := (v_churned_last_month::NUMERIC / (v_active_subscriptions + v_churned_last_month)) * 100;
  END IF;

  -- LTV = ARPU / Monthly Churn Rate (simplified)
  IF v_churn_rate > 0 THEN
    v_ltv := v_arpu / (v_churn_rate / 100);
  ELSE
    v_ltv := v_arpu * 24; -- Assume 24 months if no churn
  END IF;

  -- Previous month MRR for growth calculation
  SELECT COALESCE(SUM(
    sp.price_cents + (sub.addon_schools_count * sp.addon_school_price_cents)
  ), 0) / 100.0
  INTO v_prev_mrr
  FROM admin_subscriptions sub
  JOIN subscription_plans sp ON sp.id = sub.plan_id
  WHERE sub.status = 'active'
    AND sub.started_at < NOW() - INTERVAL '30 days';

  IF v_prev_mrr > 0 THEN
    v_mrr_growth := ((v_mrr - v_prev_mrr) / v_prev_mrr) * 100;
  END IF;

  RETURN json_build_object(
    'mrr', ROUND(v_mrr, 2),
    'arr', ROUND(v_arr, 2),
    'arpu', ROUND(v_arpu, 2),
    'ltv', ROUND(v_ltv, 2),
    'active_subscriptions', v_active_subscriptions,
    'total_customers', v_total_customers,
    'churned_last_month', v_churned_last_month,
    'churn_rate', ROUND(v_churn_rate, 2),
    'mrr_growth', ROUND(v_mrr_growth, 2)
  );
END;
$$;

-- RPC: Get school usage analytics
CREATE OR REPLACE FUNCTION public.get_school_usage_analytics(p_school_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_agg(t)
  INTO result
  FROM (
    SELECT 
      s.id,
      s.name,
      s.slug,
      s.is_active,
      COALESCE(users_count.total, 0) as total_users,
      COALESCE(posts_count.total, 0) as total_posts,
      COALESCE(posts_count.last_30_days, 0) as posts_last_30_days,
      COALESCE(logins_count.last_30_days, 0) as logins_last_30_days,
      COALESCE(logins_count.last_7_days, 0) as logins_last_7_days,
      CASE 
        WHEN COALESCE(logins_count.last_7_days, 0) = 0 THEN 'inactive'
        WHEN COALESCE(logins_count.last_7_days, 0) < 10 THEN 'low'
        WHEN COALESCE(logins_count.last_7_days, 0) < 50 THEN 'medium'
        ELSE 'high'
      END as engagement_level
    FROM schools s
    LEFT JOIN (
      SELECT school_id, COUNT(*) as total
      FROM school_memberships
      GROUP BY school_id
    ) users_count ON users_count.school_id = s.id
    LEFT JOIN (
      SELECT school_id, 
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days
      FROM posts
      GROUP BY school_id
    ) posts_count ON posts_count.school_id = s.id
    LEFT JOIN (
      SELECT 
        p.current_school_id as school_id,
        COUNT(*) FILTER (WHERE lh.logged_at >= NOW() - INTERVAL '30 days') as last_30_days,
        COUNT(*) FILTER (WHERE lh.logged_at >= NOW() - INTERVAL '7 days') as last_7_days
      FROM login_history lh
      JOIN profiles p ON p.id = lh.profile_id
      WHERE p.current_school_id IS NOT NULL
      GROUP BY p.current_school_id
    ) logins_count ON logins_count.school_id = s.id
    WHERE (p_school_id IS NULL OR s.id = p_school_id)
    ORDER BY logins_count.last_7_days DESC NULLS LAST
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- RPC: Get platform alerts
CREATE OR REPLACE FUNCTION public.get_platform_alerts(p_resolved BOOLEAN DEFAULT false)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_agg(t ORDER BY 
    CASE t.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
    t.created_at DESC
  )
  INTO result
  FROM (
    SELECT * FROM platform_alerts
    WHERE is_resolved = p_resolved
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- RPC: Generate automatic alerts
CREATE OR REPLACE FUNCTION public.generate_platform_alerts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alerts_created INT := 0;
  v_record RECORD;
BEGIN
  IF NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Alert: Subscriptions expiring in 7 days
  FOR v_record IN
    SELECT sub.id, sub.admin_id, p.name, p.email, sub.expires_at
    FROM admin_subscriptions sub
    JOIN profiles p ON p.id = sub.admin_id
    WHERE sub.status = 'active'
      AND sub.expires_at IS NOT NULL
      AND sub.expires_at <= NOW() + INTERVAL '7 days'
      AND sub.expires_at > NOW()
      AND NOT EXISTS (
        SELECT 1 FROM platform_alerts 
        WHERE entity_id = sub.admin_id 
        AND alert_type = 'SUBSCRIPTION_EXPIRING'
        AND is_resolved = false
      )
  LOOP
    INSERT INTO platform_alerts (alert_type, severity, title, message, entity_type, entity_id, entity_label)
    VALUES (
      'SUBSCRIPTION_EXPIRING',
      'warning',
      'Assinatura expirando em breve',
      'A assinatura de ' || v_record.name || ' expira em ' || 
        EXTRACT(DAY FROM v_record.expires_at - NOW()) || ' dias',
      'admin',
      v_record.admin_id,
      v_record.email
    );
    v_alerts_created := v_alerts_created + 1;
  END LOOP;

  -- Alert: Inactive schools (no logins in 14 days)
  FOR v_record IN
    SELECT s.id, s.name
    FROM schools s
    WHERE s.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM login_history lh
        JOIN profiles p ON p.id = lh.profile_id
        WHERE p.current_school_id = s.id
        AND lh.logged_at >= NOW() - INTERVAL '14 days'
      )
      AND NOT EXISTS (
        SELECT 1 FROM platform_alerts 
        WHERE entity_id = s.id 
        AND alert_type = 'INACTIVE_SCHOOL'
        AND is_resolved = false
      )
  LOOP
    INSERT INTO platform_alerts (alert_type, severity, title, message, entity_type, entity_id, entity_label)
    VALUES (
      'INACTIVE_SCHOOL',
      'warning',
      'Escola inativa',
      'A escola ' || v_record.name || ' não teve logins nos últimos 14 dias',
      'school',
      v_record.id,
      v_record.name
    );
    v_alerts_created := v_alerts_created + 1;
  END LOOP;

  RETURN v_alerts_created;
END;
$$;

-- RPC: Resolve alert
CREATE OR REPLACE FUNCTION public.resolve_platform_alert(p_alert_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE platform_alerts
  SET is_resolved = true,
      resolved_at = NOW(),
      resolved_by = auth.uid()
  WHERE id = p_alert_id;

  RETURN TRUE;
END;
$$;
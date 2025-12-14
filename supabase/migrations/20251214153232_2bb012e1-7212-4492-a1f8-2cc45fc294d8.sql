-- Add is_test_account column to admin_subscriptions
ALTER TABLE admin_subscriptions 
ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT FALSE;

-- Update get_platform_metrics to exclude test accounts from calculations
CREATE OR REPLACE FUNCTION public.get_platform_metrics()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Exclude schools owned by test accounts
  SELECT 
    COUNT(*) FILTER (WHERE NOT COALESCE(asub.is_test_account, false)), 
    COUNT(*) FILTER (WHERE s.is_active = true AND NOT COALESCE(asub.is_test_account, false))
  INTO v_total_schools, v_active_schools 
  FROM schools s
  LEFT JOIN school_memberships sm ON s.id = sm.school_id AND sm.role = 'administrador'
  LEFT JOIN admin_subscriptions asub ON sm.user_id = asub.admin_id;

  -- Exclude users from test account schools
  WITH non_test_schools AS (
    SELECT DISTINCT s.id 
    FROM schools s
    LEFT JOIN school_memberships sm ON s.id = sm.school_id AND sm.role = 'administrador'
    LEFT JOIN admin_subscriptions asub ON sm.user_id = asub.admin_id
    WHERE NOT COALESCE(asub.is_test_account, false)
  )
  SELECT 
    COUNT(DISTINCT p.id),
    COUNT(DISTINCT CASE WHEN ur.role = 'administrador' AND NOT COALESCE(asub2.is_test_account, false) THEN p.id END),
    COUNT(DISTINCT CASE WHEN ur.role = 'professor' AND sm2.school_id IN (SELECT id FROM non_test_schools) THEN p.id END),
    COUNT(DISTINCT CASE WHEN ur.role = 'secretaria' AND sm2.school_id IN (SELECT id FROM non_test_schools) THEN p.id END),
    COUNT(DISTINCT CASE WHEN ur.role = 'aluno' AND sm2.school_id IN (SELECT id FROM non_test_schools) THEN p.id END)
  INTO v_total_users, v_total_admins, v_total_teachers, v_total_secretarias, v_total_students
  FROM profiles p 
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  LEFT JOIN school_memberships sm2 ON p.id = sm2.user_id
  LEFT JOIN admin_subscriptions asub2 ON p.id = asub2.admin_id;

  -- Exclude test accounts from subscription counts
  SELECT 
    COUNT(*) FILTER (WHERE NOT COALESCE(is_test_account, false)), 
    COUNT(*) FILTER (WHERE status = 'active' AND NOT COALESCE(is_test_account, false)) 
  INTO v_total_subscriptions, v_active_subscriptions 
  FROM admin_subscriptions;

  -- MRR excluding test accounts
  SELECT COALESCE(SUM(
    CASE WHEN asub.status = 'active' AND NOT COALESCE(asub.is_test_account, false) THEN
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
$function$;
-- Fix get_platform_metrics to properly exclude test account users from total_users count
CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_schools INT;
  v_total_users INT;
  v_total_admins INT;
  v_total_teachers INT;
  v_total_secretarias INT;
  v_total_students INT;
  v_active_subscriptions INT;
  v_trial_subscriptions INT;
  v_mrr_cents BIGINT;
  v_logins_today INT;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas superadmins podem acessar métricas da plataforma';
  END IF;

  -- Count schools excluding those from test accounts
  SELECT COUNT(*) INTO v_total_schools
  FROM schools s
  WHERE EXISTS (
    SELECT 1 FROM school_memberships sm
    JOIN admin_subscriptions asub ON sm.user_id = asub.admin_id
    WHERE sm.school_id = s.id 
      AND sm.role = 'administrador'
      AND NOT COALESCE(asub.is_test_account, false)
  );

  -- Get IDs of non-test schools for filtering users
  WITH non_test_schools AS (
    SELECT DISTINCT s.id 
    FROM schools s
    JOIN school_memberships sm ON s.id = sm.school_id AND sm.role = 'administrador'
    JOIN admin_subscriptions asub ON sm.user_id = asub.admin_id
    WHERE NOT COALESCE(asub.is_test_account, false)
  )
  SELECT 
    -- Admins que não são contas de teste
    COUNT(DISTINCT CASE 
      WHEN ur.role = 'administrador' AND NOT COALESCE(asub2.is_test_account, false) 
      THEN p.id 
    END),
    -- Professores em escolas não-teste
    COUNT(DISTINCT CASE 
      WHEN ur.role = 'professor' AND sm2.school_id IN (SELECT id FROM non_test_schools) 
      THEN p.id 
    END),
    -- Secretárias em escolas não-teste
    COUNT(DISTINCT CASE 
      WHEN ur.role = 'secretaria' AND sm2.school_id IN (SELECT id FROM non_test_schools) 
      THEN p.id 
    END),
    -- Alunos em escolas não-teste
    COUNT(DISTINCT CASE 
      WHEN ur.role = 'aluno' AND sm2.school_id IN (SELECT id FROM non_test_schools) 
      THEN p.id 
    END)
  INTO v_total_admins, v_total_teachers, v_total_secretarias, v_total_students
  FROM profiles p 
  JOIN user_roles ur ON p.id = ur.user_id
  LEFT JOIN school_memberships sm2 ON p.id = sm2.user_id
  LEFT JOIN admin_subscriptions asub2 ON p.id = asub2.admin_id;

  -- Total users is now the sum of filtered users
  v_total_users := v_total_admins + v_total_teachers + v_total_secretarias + v_total_students;

  -- Count active subscriptions excluding test accounts
  SELECT COUNT(*) INTO v_active_subscriptions
  FROM admin_subscriptions
  WHERE status = 'active' 
    AND NOT COALESCE(is_test_account, false);

  -- Count trial subscriptions excluding test accounts
  SELECT COUNT(*) INTO v_trial_subscriptions
  FROM admin_subscriptions
  WHERE status = 'trial' 
    AND NOT COALESCE(is_test_account, false);

  -- Calculate MRR excluding test accounts
  SELECT COALESCE(SUM(
    CASE 
      WHEN asub.status = 'active' AND NOT COALESCE(asub.is_test_account, false) THEN 
        sp.price_cents + (asub.addon_schools_count * sp.addon_school_price_cents)
        - COALESCE(asub.discount_cents, 0)
        - FLOOR((sp.price_cents + (asub.addon_schools_count * sp.addon_school_price_cents)) * COALESCE(asub.discount_percent, 0) / 100)
      ELSE 0 
    END
  ), 0) INTO v_mrr_cents
  FROM admin_subscriptions asub
  JOIN subscription_plans sp ON asub.plan_id = sp.id;

  -- Count logins today excluding users from test accounts
  SELECT COUNT(*) INTO v_logins_today
  FROM login_history lh
  WHERE lh.logged_at::date = CURRENT_DATE
    AND NOT EXISTS (
      -- Exclude if user is a test admin
      SELECT 1 FROM admin_subscriptions asub 
      WHERE asub.admin_id = lh.user_id 
        AND COALESCE(asub.is_test_account, false) = true
    )
    AND NOT EXISTS (
      -- Exclude if user belongs to a school owned by test admin
      SELECT 1 FROM school_memberships sm
      JOIN school_memberships admin_sm ON sm.school_id = admin_sm.school_id AND admin_sm.role = 'administrador'
      JOIN admin_subscriptions asub ON admin_sm.user_id = asub.admin_id
      WHERE sm.user_id = lh.user_id
        AND COALESCE(asub.is_test_account, false) = true
    );

  RETURN jsonb_build_object(
    'total_schools', COALESCE(v_total_schools, 0),
    'total_users', COALESCE(v_total_users, 0),
    'total_admins', COALESCE(v_total_admins, 0),
    'total_teachers', COALESCE(v_total_teachers, 0),
    'total_secretarias', COALESCE(v_total_secretarias, 0),
    'total_students', COALESCE(v_total_students, 0),
    'active_subscriptions', COALESCE(v_active_subscriptions, 0),
    'trial_subscriptions', COALESCE(v_trial_subscriptions, 0),
    'mrr_cents', COALESCE(v_mrr_cents, 0),
    'logins_today', COALESCE(v_logins_today, 0)
  );
END;
$function$;
-- Update get_admins_overview to include is_test_account field
CREATE OR REPLACE FUNCTION public.get_admins_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas superadmins podem acessar visão geral dos administradores';
  END IF;

  SELECT jsonb_agg(admin_data ORDER BY created_at DESC) INTO v_result
  FROM (
    SELECT 
      p.id,
      p.name,
      p.email,
      p.phone,
      p.avatar,
      p.created_at,
      p.is_active,
      (SELECT COUNT(*) FROM school_memberships WHERE user_id = p.id AND role = 'administrador') as schools_count,
      (SELECT COALESCE(SUM(sub.student_count), 0) FROM (
        SELECT school_id, (SELECT COUNT(*) FROM school_memberships WHERE school_id = sm2.school_id AND role = 'aluno') as student_count
        FROM school_memberships sm2 WHERE sm2.user_id = p.id AND sm2.role = 'administrador'
      ) sub) as total_students,
      COALESCE(asub.is_test_account, false) as is_test_account,
      CASE WHEN asub.id IS NOT NULL THEN
        jsonb_build_object(
          'id', asub.id,
          'status', asub.status,
          'plan_name', sp.name,
          'plan_slug', sp.slug,
          'price_cents', sp.price_cents,
          'max_students', sp.max_students,
          'included_schools', sp.included_schools,
          'addon_schools', COALESCE(asub.addon_schools_count, 0),
          'started_at', asub.started_at,
          'expires_at', asub.expires_at,
          'trial_ends_at', asub.trial_ends_at
        )
      ELSE NULL END as subscription
    FROM profiles p
    INNER JOIN user_roles ur ON p.id = ur.user_id AND ur.role = 'administrador'
    LEFT JOIN admin_subscriptions asub ON p.id = asub.admin_id
    LEFT JOIN subscription_plans sp ON asub.plan_id = sp.id
  ) admin_data;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;
-- Atualizar função get_admins_overview para incluir campos de implantação
CREATE OR REPLACE FUNCTION public.get_admins_overview()
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
          'discount_reason', asub.discount_reason,
          'implantation_paid', COALESCE(asub.implantation_paid, false),
          'implantation_paid_at', asub.implantation_paid_at,
          'implantation_notes', asub.implantation_notes
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
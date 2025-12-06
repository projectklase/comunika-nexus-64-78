-- Update get_schools_overview to include admin info and school order
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

  SELECT COALESCE(jsonb_agg(school_data ORDER BY admin_name, school_order), '[]'::jsonb)
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
      -- Admin info
      admin_data.admin_id,
      admin_data.admin_name,
      admin_data.admin_email,
      admin_data.school_order,
      CASE WHEN admin_data.school_order > 1 THEN true ELSE false END as is_addon_school,
      -- Subscription info
      (
        SELECT jsonb_build_object(
          'id', sub.id,
          'status', sub.status,
          'plan_name', sp.name,
          'plan_slug', sp.slug,
          'price_cents', sp.price_cents,
          'addon_school_price_cents', sp.addon_school_price_cents,
          'max_students', sp.max_students,
          'included_schools', sp.included_schools,
          'addon_schools', sub.addon_schools_count,
          'started_at', sub.started_at,
          'expires_at', sub.expires_at,
          'trial_ends_at', sub.trial_ends_at
        )
        FROM admin_subscriptions sub
        JOIN subscription_plans sp ON sp.id = sub.plan_id
        WHERE sub.admin_id = admin_data.admin_id
          AND sub.status = 'active'
        LIMIT 1
      ) as subscription
    FROM schools s
    LEFT JOIN LATERAL (
      SELECT 
        adm_sm.user_id as admin_id,
        p.name as admin_name,
        p.email as admin_email,
        ROW_NUMBER() OVER (
          PARTITION BY adm_sm.user_id 
          ORDER BY s2.created_at ASC
        ) as school_order
      FROM school_memberships adm_sm
      JOIN profiles p ON p.id = adm_sm.user_id
      JOIN schools s2 ON s2.id = adm_sm.school_id
      WHERE adm_sm.school_id = s.id 
        AND adm_sm.role = 'administrador'
      LIMIT 1
    ) admin_data ON true
  ) school_data;

  RETURN v_result;
END;
$$;
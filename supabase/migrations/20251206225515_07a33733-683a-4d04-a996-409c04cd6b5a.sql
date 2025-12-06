-- Dropar e recriar RPC get_schools_overview com lógica correta
DROP FUNCTION IF EXISTS public.get_schools_overview();

CREATE FUNCTION public.get_schools_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  -- Verificar se usuário é superadmin
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem acessar esta função';
  END IF;

  WITH admin_school_orders AS (
    -- Calcular a ordem de TODAS as escolas por admin
    SELECT 
      sm.school_id,
      sm.user_id as admin_id,
      p.name as admin_name,
      p.email as admin_email,
      ROW_NUMBER() OVER (
        PARTITION BY sm.user_id 
        ORDER BY s.created_at ASC
      ) as school_order
    FROM school_memberships sm
    JOIN profiles p ON p.id = sm.user_id
    JOIN schools s ON s.id = sm.school_id
    WHERE sm.role = 'administrador'
  ),
  school_data AS (
    SELECT 
      s.id,
      s.name,
      s.slug,
      s.logo_url,
      s.is_active,
      s.created_at,
      s.updated_at,
      aso.admin_id,
      aso.admin_name,
      aso.admin_email,
      COALESCE(aso.school_order, 1) as school_order,
      CASE WHEN COALESCE(aso.school_order, 1) > 1 THEN true ELSE false END as is_addon_school,
      (
        SELECT COUNT(*)::int
        FROM school_memberships sm
        WHERE sm.school_id = s.id
      ) as total_users,
      (
        SELECT COUNT(*)::int
        FROM school_memberships sm
        WHERE sm.school_id = s.id AND sm.role = 'aluno'
      ) as total_students,
      (
        SELECT json_build_object(
          'id', asub.id,
          'status', asub.status,
          'plan_name', sp.name,
          'plan_slug', sp.slug,
          'price_cents', sp.price_cents,
          'addon_school_price_cents', sp.addon_school_price_cents,
          'included_schools', sp.included_schools,
          'addon_schools_count', asub.addon_schools_count,
          'max_students', sp.max_students,
          'started_at', asub.started_at,
          'expires_at', asub.expires_at,
          'trial_ends_at', asub.trial_ends_at
        )
        FROM admin_subscriptions asub
        JOIN subscription_plans sp ON sp.id = asub.plan_id
        WHERE asub.admin_id = aso.admin_id
        LIMIT 1
      ) as subscription
    FROM schools s
    LEFT JOIN admin_school_orders aso ON aso.school_id = s.id
  )
  SELECT json_agg(
    json_build_object(
      'id', sd.id,
      'name', sd.name,
      'slug', sd.slug,
      'logo_url', sd.logo_url,
      'is_active', sd.is_active,
      'created_at', sd.created_at,
      'updated_at', sd.updated_at,
      'admin_id', sd.admin_id,
      'admin_name', sd.admin_name,
      'admin_email', sd.admin_email,
      'school_order', sd.school_order,
      'is_addon_school', sd.is_addon_school,
      'total_users', sd.total_users,
      'total_students', sd.total_students,
      'subscription', sd.subscription
    )
    ORDER BY sd.admin_name NULLS LAST, sd.school_order
  ) INTO result
  FROM school_data sd;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
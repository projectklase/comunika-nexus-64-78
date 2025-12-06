-- RPC para buscar todos os administradores com suas assinaturas
CREATE OR REPLACE FUNCTION public.get_admins_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verificar se é superadmin
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem acessar esta função';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'email', p.email,
      'phone', p.phone,
      'avatar', p.avatar,
      'created_at', p.created_at,
      'is_active', COALESCE(p.is_active, true),
      'schools_count', (
        SELECT COUNT(*)::int 
        FROM school_memberships sm 
        WHERE sm.user_id = p.id AND sm.role = 'administrador'
      ),
      'total_students', (
        SELECT COUNT(DISTINCT sm2.user_id)::int
        FROM school_memberships sm
        JOIN school_memberships sm2 ON sm2.school_id = sm.school_id AND sm2.role = 'aluno'
        WHERE sm.user_id = p.id AND sm.role = 'administrador'
      ),
      'subscription', (
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
        WHERE sub.admin_id = p.id
        ORDER BY sub.created_at DESC
        LIMIT 1
      )
    ) ORDER BY p.created_at DESC
  ), '[]'::jsonb) INTO v_result
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'administrador'::app_role
  );

  RETURN v_result;
END;
$$;

-- RPC para atualizar escola (nome, slug, logo, cor, status)
CREATE OR REPLACE FUNCTION public.update_school_admin(
  p_school_id uuid,
  p_name text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_primary_color text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_school_before jsonb;
  v_school_after jsonb;
BEGIN
  -- Verificar se é superadmin
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem atualizar escolas';
  END IF;

  -- Capturar estado anterior para audit
  SELECT jsonb_build_object(
    'name', name,
    'slug', slug,
    'logo_url', logo_url,
    'primary_color', primary_color,
    'is_active', is_active
  ) INTO v_school_before
  FROM schools WHERE id = p_school_id;

  IF v_school_before IS NULL THEN
    RAISE EXCEPTION 'Escola não encontrada';
  END IF;

  -- Atualizar escola
  UPDATE schools SET
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    logo_url = COALESCE(p_logo_url, logo_url),
    primary_color = COALESCE(p_primary_color, primary_color),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_school_id;

  -- Capturar estado após
  SELECT jsonb_build_object(
    'name', name,
    'slug', slug,
    'logo_url', logo_url,
    'primary_color', primary_color,
    'is_active', is_active
  ) INTO v_school_after
  FROM schools WHERE id = p_school_id;

  -- Registrar no audit log
  PERFORM log_superadmin_action(
    CASE WHEN p_is_active IS NOT NULL AND p_is_active != (v_school_before->>'is_active')::boolean 
      THEN CASE WHEN p_is_active THEN 'ACTIVATE' ELSE 'DEACTIVATE' END
      ELSE 'UPDATE'
    END,
    'SCHOOL',
    p_school_id,
    v_school_after->>'name',
    jsonb_build_object('before', v_school_before, 'after', v_school_after)
  );

  RETURN v_school_after;
END;
$$;

-- RPC para atualizar assinatura manualmente
CREATE OR REPLACE FUNCTION public.update_subscription_admin(
  p_admin_id uuid,
  p_plan_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_addon_schools_count integer DEFAULT NULL,
  p_trial_ends_at timestamp with time zone DEFAULT NULL,
  p_expires_at timestamp with time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_subscription_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_admin_name text;
BEGIN
  -- Verificar se é superadmin
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem atualizar assinaturas';
  END IF;

  -- Buscar nome do admin para audit
  SELECT name INTO v_admin_name FROM profiles WHERE id = p_admin_id;

  -- Verificar se existe assinatura
  SELECT id INTO v_subscription_id FROM admin_subscriptions WHERE admin_id = p_admin_id LIMIT 1;

  IF v_subscription_id IS NULL THEN
    -- Criar nova assinatura
    IF p_plan_id IS NULL THEN
      RAISE EXCEPTION 'Plan ID é obrigatório para criar nova assinatura';
    END IF;

    INSERT INTO admin_subscriptions (
      admin_id,
      plan_id,
      status,
      addon_schools_count,
      trial_ends_at,
      expires_at,
      started_at
    ) VALUES (
      p_admin_id,
      p_plan_id,
      COALESCE(p_status, 'active'),
      COALESCE(p_addon_schools_count, 0),
      p_trial_ends_at,
      p_expires_at,
      NOW()
    )
    RETURNING id INTO v_subscription_id;

    SELECT jsonb_build_object(
      'id', sub.id,
      'status', sub.status,
      'plan_name', sp.name,
      'addon_schools', sub.addon_schools_count,
      'trial_ends_at', sub.trial_ends_at,
      'expires_at', sub.expires_at
    ) INTO v_after
    FROM admin_subscriptions sub
    JOIN subscription_plans sp ON sp.id = sub.plan_id
    WHERE sub.id = v_subscription_id;

    -- Log criação
    PERFORM log_superadmin_action(
      'CREATE_SUBSCRIPTION',
      'SUBSCRIPTION',
      v_subscription_id,
      v_admin_name,
      jsonb_build_object('subscription', v_after)
    );

    RETURN v_after;
  END IF;

  -- Capturar estado anterior
  SELECT jsonb_build_object(
    'id', sub.id,
    'status', sub.status,
    'plan_name', sp.name,
    'addon_schools', sub.addon_schools_count,
    'trial_ends_at', sub.trial_ends_at,
    'expires_at', sub.expires_at
  ) INTO v_before
  FROM admin_subscriptions sub
  JOIN subscription_plans sp ON sp.id = sub.plan_id
  WHERE sub.id = v_subscription_id;

  -- Atualizar assinatura
  UPDATE admin_subscriptions SET
    plan_id = COALESCE(p_plan_id, plan_id),
    status = COALESCE(p_status, status),
    addon_schools_count = COALESCE(p_addon_schools_count, addon_schools_count),
    trial_ends_at = COALESCE(p_trial_ends_at, trial_ends_at),
    expires_at = COALESCE(p_expires_at, expires_at),
    updated_at = NOW()
  WHERE id = v_subscription_id;

  -- Capturar estado após
  SELECT jsonb_build_object(
    'id', sub.id,
    'status', sub.status,
    'plan_name', sp.name,
    'addon_schools', sub.addon_schools_count,
    'trial_ends_at', sub.trial_ends_at,
    'expires_at', sub.expires_at
  ) INTO v_after
  FROM admin_subscriptions sub
  JOIN subscription_plans sp ON sp.id = sub.plan_id
  WHERE sub.id = v_subscription_id;

  -- Log atualização
  PERFORM log_superadmin_action(
    'UPDATE_SUBSCRIPTION',
    'SUBSCRIPTION',
    v_subscription_id,
    v_admin_name,
    jsonb_build_object('before', v_before, 'after', v_after)
  );

  RETURN v_after;
END;
$$;

-- RPC para buscar todos os planos disponíveis
CREATE OR REPLACE FUNCTION public.get_subscription_plans()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'price_cents', price_cents,
        'max_students', max_students,
        'included_schools', included_schools,
        'addon_school_price_cents', addon_school_price_cents,
        'features', features,
        'is_active', is_active
      ) ORDER BY price_cents ASC
    ), '[]'::jsonb)
    FROM subscription_plans
    WHERE is_active = true
  );
END;
$$;
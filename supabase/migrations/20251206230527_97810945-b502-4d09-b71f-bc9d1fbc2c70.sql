-- Corrigir addon_schools_count nos dados existentes
UPDATE admin_subscriptions sub
SET addon_schools_count = subquery.real_addons
FROM (
  SELECT 
    asub.id as subscription_id,
    GREATEST(0, 
      (SELECT COUNT(*)::int FROM school_memberships sm 
       WHERE sm.user_id = asub.admin_id AND sm.role = 'administrador') 
      - sp.included_schools
    ) as real_addons
  FROM admin_subscriptions asub
  JOIN subscription_plans sp ON sp.id = asub.plan_id
  WHERE asub.status = 'active'
) AS subquery
WHERE sub.id = subquery.subscription_id;

-- Recriar get_platform_metrics com cálculo dinâmico de MRR
DROP FUNCTION IF EXISTS public.get_platform_metrics();

CREATE FUNCTION public.get_platform_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  total_schools int;
  total_students int;
  total_admins int;
  active_subscriptions int;
  mrr_cents bigint;
  arpu_cents bigint;
  churn_rate numeric;
BEGIN
  -- Verificar se usuário é superadmin
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem acessar esta função';
  END IF;

  -- Total de escolas ativas
  SELECT COUNT(*) INTO total_schools FROM schools WHERE is_active = true;

  -- Total de alunos (role = 'aluno')
  SELECT COUNT(DISTINCT sm.user_id) INTO total_students
  FROM school_memberships sm
  WHERE sm.role = 'aluno';

  -- Total de admins únicos
  SELECT COUNT(DISTINCT sm.user_id) INTO total_admins
  FROM school_memberships sm
  WHERE sm.role = 'administrador';

  -- Assinaturas ativas
  SELECT COUNT(*) INTO active_subscriptions
  FROM admin_subscriptions
  WHERE status = 'active';

  -- MRR com cálculo DINÂMICO de add-ons reais
  SELECT COALESCE(SUM(
    sp.price_cents + (
      GREATEST(0, 
        (SELECT COUNT(*)::int FROM school_memberships sm 
         WHERE sm.user_id = asub.admin_id AND sm.role = 'administrador') 
        - sp.included_schools
      ) * sp.addon_school_price_cents
    )
  ), 0) INTO mrr_cents
  FROM admin_subscriptions asub
  JOIN subscription_plans sp ON sp.id = asub.plan_id
  WHERE asub.status = 'active';

  -- ARPU (Average Revenue Per User/Admin)
  IF active_subscriptions > 0 THEN
    arpu_cents := mrr_cents / active_subscriptions;
  ELSE
    arpu_cents := 0;
  END IF;

  -- Churn rate (placeholder - 0% por enquanto)
  churn_rate := 0;

  result := json_build_object(
    'total_schools', total_schools,
    'total_students', total_students,
    'total_admins', total_admins,
    'active_subscriptions', active_subscriptions,
    'mrr_cents', mrr_cents,
    'arpu_cents', arpu_cents,
    'churn_rate', churn_rate
  );

  RETURN result;
END;
$$;
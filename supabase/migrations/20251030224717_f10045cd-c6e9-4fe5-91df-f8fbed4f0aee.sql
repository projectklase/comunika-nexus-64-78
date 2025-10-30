-- Corrigir a função get_evasion_risk_analytics
-- O problema era que as CTEs estavam saindo de escopo quando usadas em múltiplos SELECT

CREATE OR REPLACE FUNCTION public.get_evasion_risk_analytics(
  days_filter integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_result jsonb;
  v_students_at_risk jsonb;
  v_students_at_risk_count int;
  v_activity_trend jsonb;
  v_worst_class_name text;
  v_worst_class_count int;
BEGIN
  -- ✅ VALIDAÇÃO DE SEGURANÇA
  SELECT ur.role::text INTO v_caller_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
  
  IF v_caller_role IS NULL OR v_caller_role != 'administrador' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar analytics'
      USING HINT = 'Você precisa ter o role "administrador" para chamar esta função';
  END IF;

  -- ✅ QUERY ÚNICA COM TODAS AS CTEs
  WITH students_at_risk AS (
    SELECT 
      p.id as student_id,
      p.name as student_name,
      c.name as class_name,
      CASE 
        WHEN au.last_sign_in_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM (NOW() - au.last_sign_in_at))::int
      END as days_since_last_login,
      COALESCE((
        SELECT COUNT(*)::int 
        FROM deliveries d 
        WHERE d.student_id = p.id 
          AND d.review_status = 'AGUARDANDO'
      ), 0) as pending_deliveries,
      COALESCE((
        SELECT COUNT(*)::int
        FROM deliveries d
        WHERE d.student_id = p.id
          AND d.review_status = 'AGUARDANDO'
          AND d.submitted_at IS NOT NULL
      ), 0) as pending_evaluations
    FROM 
      profiles p
    INNER JOIN
      user_roles ur ON ur.user_id = p.id AND ur.role = 'aluno'
    LEFT JOIN
      auth.users au ON au.id = p.id
    LEFT JOIN
      class_students cs ON cs.student_id = p.id
    LEFT JOIN
      classes c ON c.id = cs.class_id
    WHERE 
      p.is_active = true
      AND (
        au.last_sign_in_at < (NOW() - INTERVAL '7 days')
        OR au.last_sign_in_at IS NULL
        OR (
          SELECT COUNT(*) 
          FROM deliveries d 
          WHERE d.student_id = p.id 
            AND d.review_status = 'AGUARDANDO'
        ) > 0
      )
    ORDER BY
      days_since_last_login DESC NULLS LAST, 
      pending_deliveries DESC
    LIMIT 10
  ),
  activity_trend AS (
    SELECT 
      date_series.date::text as date,
      COALESCE(COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'PUBLISHED'), 0)::int as activities_published,
      COALESCE(COUNT(DISTINCT d.id), 0)::int as deliveries_made
    FROM 
      generate_series(
        (CURRENT_DATE - days_filter * INTERVAL '1 day')::date,
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS date_series(date)
    LEFT JOIN
      posts p ON DATE(p.created_at) = date_series.date::date AND p.type IN ('ATIVIDADE', 'TRABALHO', 'PROVA')
    LEFT JOIN
      deliveries d ON DATE(d.submitted_at) = date_series.date::date
    GROUP BY date_series.date
    ORDER BY date_series.date
  ),
  worst_class AS (
    SELECT 
      c.name as class_name,
      COUNT(d.id)::int as pending_count
    FROM 
      classes c
    LEFT JOIN
      class_students cs ON cs.class_id = c.id
    LEFT JOIN
      deliveries d ON d.student_id = cs.student_id AND d.review_status = 'AGUARDANDO'
    WHERE
      c.status = 'Ativa'
    GROUP BY c.id, c.name
    ORDER BY pending_count DESC NULLS LAST
    LIMIT 1
  )
  -- ✅ AGORA O SELECT ESTÁ DENTRO DO CONTEXTO DO WITH
  SELECT 
    (SELECT COUNT(*)::int FROM students_at_risk),
    (SELECT jsonb_agg(row_to_json(s.*)) FROM students_at_risk s),
    (SELECT jsonb_agg(row_to_json(a.*)) FROM activity_trend a),
    (SELECT class_name FROM worst_class),
    (SELECT pending_count FROM worst_class)
  INTO 
    v_students_at_risk_count, 
    v_students_at_risk, 
    v_activity_trend, 
    v_worst_class_name, 
    v_worst_class_count;

  -- ✅ Montar JSON de Resposta
  v_result := jsonb_build_object(
    'students_at_risk_count', COALESCE(v_students_at_risk_count, 0),
    'worst_class_name', v_worst_class_name,
    'worst_class_pending_count', COALESCE(v_worst_class_count, 0),
    'activity_trend', COALESCE(v_activity_trend, '[]'::jsonb),
    'students_at_risk_list', COALESCE(v_students_at_risk, '[]'::jsonb)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao processar analytics: %', SQLERRM
      USING HINT = 'Verifique os logs do servidor para mais detalhes';
END;
$$;
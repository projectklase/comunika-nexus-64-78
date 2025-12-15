-- Remover AMBAS as versões duplicadas da função
DROP FUNCTION IF EXISTS public.get_evasion_risk_analytics(integer, uuid);
DROP FUNCTION IF EXISTS public.get_evasion_risk_analytics(uuid, integer);

-- Recriar a versão correta com search_path seguro
CREATE OR REPLACE FUNCTION public.get_evasion_risk_analytics(
  school_id_param uuid,
  days_filter integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_students_at_risk integer;
  v_avg_days_inactive numeric;
  v_inactive_rate numeric;
  v_activity_trend jsonb;
  v_students_list jsonb;
BEGIN
  -- Calcular alunos em risco (sem login nos últimos X dias)
  SELECT COUNT(DISTINCT p.id)
  INTO v_students_at_risk
  FROM profiles p
  JOIN school_memberships sm ON sm.user_id = p.id
  WHERE sm.school_id = school_id_param
    AND sm.role = 'aluno'
    AND p.is_active = true
    AND (p.last_activity_date IS NULL OR p.last_activity_date < NOW() - (days_filter || ' days')::interval);

  -- Média de dias inativos
  SELECT COALESCE(AVG(EXTRACT(DAY FROM NOW() - p.last_activity_date)), 0)
  INTO v_avg_days_inactive
  FROM profiles p
  JOIN school_memberships sm ON sm.user_id = p.id
  WHERE sm.school_id = school_id_param
    AND sm.role = 'aluno'
    AND p.is_active = true
    AND p.last_activity_date IS NOT NULL;

  -- Taxa de inatividade
  SELECT COALESCE(
    (v_students_at_risk::numeric / NULLIF(COUNT(DISTINCT p.id), 0)) * 100,
    0
  )
  INTO v_inactive_rate
  FROM profiles p
  JOIN school_memberships sm ON sm.user_id = p.id
  WHERE sm.school_id = school_id_param
    AND sm.role = 'aluno'
    AND p.is_active = true;

  -- Activity trend - QUERIES REAIS (não mais hardcoded)
  WITH date_series AS (
    SELECT generate_series(
      (NOW() - ((days_filter - 1) || ' days')::interval)::date,
      NOW()::date,
      '1 day'::interval
    )::date AS date
  ),
  daily_activities AS (
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as activities_published
    FROM posts 
    WHERE school_id = school_id_param 
      AND type IN ('ATIVIDADE', 'TRABALHO', 'PROVA')
      AND status = 'PUBLISHED'
      AND created_at >= NOW() - (days_filter || ' days')::interval
    GROUP BY DATE(created_at)
  ),
  daily_deliveries AS (
    SELECT 
      DATE(submitted_at) as date,
      COUNT(*) as deliveries_made
    FROM deliveries
    WHERE school_id = school_id_param
      AND submitted_at >= NOW() - (days_filter || ' days')::interval
    GROUP BY DATE(submitted_at)
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'date', ds.date::text,
        'activities_published', COALESCE(da.activities_published, 0),
        'deliveries_made', COALESCE(dd.deliveries_made, 0)
      ) ORDER BY ds.date
    ),
    '[]'::jsonb
  )
  INTO v_activity_trend
  FROM date_series ds
  LEFT JOIN daily_activities da ON da.date = ds.date
  LEFT JOIN daily_deliveries dd ON dd.date = ds.date;

  -- Lista de alunos em risco - COM DISTINCT ON para evitar duplicatas
  SELECT COALESCE(
    jsonb_agg(student_data ORDER BY days_inactive DESC),
    '[]'::jsonb
  )
  INTO v_students_list
  FROM (
    SELECT DISTINCT ON (p.id)
      jsonb_build_object(
        'student_id', p.id,
        'student_name', p.name,
        'last_activity', p.last_activity_date,
        'days_inactive', EXTRACT(DAY FROM NOW() - COALESCE(p.last_activity_date, p.created_at))::integer,
        'class_name', c.name,
        'current_streak', COALESCE(p.current_streak_days, 0),
        'total_xp', COALESCE(p.total_xp, 0)
      ) as student_data,
      EXTRACT(DAY FROM NOW() - COALESCE(p.last_activity_date, p.created_at))::integer as days_inactive
    FROM profiles p
    JOIN school_memberships sm ON sm.user_id = p.id
    LEFT JOIN class_students cs ON cs.student_id = p.id
    LEFT JOIN classes c ON c.id = cs.class_id AND c.school_id = school_id_param
    WHERE sm.school_id = school_id_param
      AND sm.role = 'aluno'
      AND p.is_active = true
      AND (p.last_activity_date IS NULL OR p.last_activity_date < NOW() - (days_filter || ' days')::interval)
    ORDER BY p.id, c.name NULLS LAST
    LIMIT 20
  ) subq;

  -- Montar resultado final
  result := jsonb_build_object(
    'students_at_risk', v_students_at_risk,
    'avg_days_inactive', ROUND(v_avg_days_inactive, 1),
    'inactive_rate', ROUND(v_inactive_rate, 1),
    'activity_trend', v_activity_trend,
    'students_at_risk_list', v_students_list
  );

  RETURN result;
END;
$$;
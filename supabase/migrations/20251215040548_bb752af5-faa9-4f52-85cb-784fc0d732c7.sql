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
  v_result jsonb;
  v_students_at_risk_count integer;
  v_avg_inactive_days numeric;
  v_inactive_rate numeric;
  v_total_students integer;
  v_activity_trend jsonb;
  v_students_list jsonb;
  v_worst_class_name text;
  v_worst_class_pending_count integer;
BEGIN
  -- Contar total de alunos da escola
  SELECT COUNT(*) INTO v_total_students
  FROM school_memberships sm
  WHERE sm.school_id = school_id_param 
    AND sm.role = 'aluno';

  -- Construir lista de alunos em risco com pending_deliveries e pending_evaluations
  WITH student_activity AS (
    SELECT 
      p.id as student_id,
      p.name as student_name,
      c.name as class_name,
      COALESCE(
        EXTRACT(DAY FROM NOW() - MAX(lh.logged_at)),
        EXTRACT(DAY FROM NOW() - p.created_at)
      )::integer as days_since_last_login,
      (
        SELECT COUNT(*)
        FROM posts po
        LEFT JOIN deliveries d ON d.post_id = po.id::text AND d.student_id = p.id
        WHERE po.school_id = school_id_param
          AND po.type = 'ATIVIDADE'
          AND po.status = 'PUBLISHED'
          AND po.due_at >= NOW() - (days_filter || ' days')::interval
          AND d.id IS NULL
          AND (po.audience = 'GLOBAL' OR po.class_id = c.id::text OR c.id::text = ANY(po.class_ids))
      )::integer as pending_deliveries,
      (
        SELECT COUNT(*)
        FROM deliveries d
        JOIN posts po ON po.id::text = d.post_id
        WHERE d.student_id = p.id
          AND d.review_status = 'AGUARDANDO'
          AND po.school_id = school_id_param
      )::integer as pending_evaluations
    FROM profiles p
    INNER JOIN school_memberships sm ON sm.user_id = p.id
    LEFT JOIN class_students cs ON cs.student_id = p.id
    LEFT JOIN classes c ON c.id = cs.class_id
    LEFT JOIN login_history lh ON lh.user_id = p.id
    WHERE sm.school_id = school_id_param 
      AND sm.role = 'aluno'
      AND p.is_active = true
    GROUP BY p.id, p.name, p.created_at, c.id, c.name
  ),
  at_risk_students AS (
    SELECT *
    FROM student_activity
    WHERE days_since_last_login > 7 
       OR pending_deliveries > 0
       OR pending_evaluations > 0
  )
  SELECT 
    COUNT(*),
    jsonb_agg(
      jsonb_build_object(
        'student_id', student_id,
        'student_name', student_name,
        'class_name', class_name,
        'days_since_last_login', days_since_last_login,
        'pending_deliveries', pending_deliveries,
        'pending_evaluations', pending_evaluations
      )
      ORDER BY pending_deliveries DESC, days_since_last_login DESC
    )
  INTO v_students_at_risk_count, v_students_list
  FROM at_risk_students;

  SELECT COALESCE(AVG(days_since_last_login), 0)
  INTO v_avg_inactive_days
  FROM (
    SELECT 
      COALESCE(
        EXTRACT(DAY FROM NOW() - MAX(lh.logged_at)),
        EXTRACT(DAY FROM NOW() - p.created_at)
      ) as days_since_last_login
    FROM profiles p
    INNER JOIN school_memberships sm ON sm.user_id = p.id
    LEFT JOIN login_history lh ON lh.user_id = p.id
    WHERE sm.school_id = school_id_param 
      AND sm.role = 'aluno'
    GROUP BY p.id, p.created_at
  ) inactive_calc;

  v_inactive_rate := CASE 
    WHEN v_total_students > 0 
    THEN (v_students_at_risk_count::numeric / v_total_students::numeric) * 100 
    ELSE 0 
  END;

  SELECT c.name, COUNT(*)
  INTO v_worst_class_name, v_worst_class_pending_count
  FROM deliveries d
  JOIN classes c ON c.id::text = d.class_id
  WHERE d.school_id = school_id_param
    AND d.review_status = 'AGUARDANDO'
  GROUP BY c.name
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', activity_date::text,
      'activities_published', activities_count,
      'deliveries_made', deliveries_count
    )
    ORDER BY activity_date
  ), '[]'::jsonb)
  INTO v_activity_trend
  FROM (
    SELECT 
      d.activity_date,
      COALESCE(p.activities_count, 0) as activities_count,
      COALESCE(del.deliveries_count, 0) as deliveries_count
    FROM generate_series(
      CURRENT_DATE - (days_filter - 1),
      CURRENT_DATE,
      '1 day'::interval
    ) as d(activity_date)
    LEFT JOIN (
      SELECT DATE(created_at) as pub_date, COUNT(*) as activities_count
      FROM posts
      WHERE school_id = school_id_param
        AND type = 'ATIVIDADE'
        AND created_at >= NOW() - (days_filter || ' days')::interval
      GROUP BY DATE(created_at)
    ) p ON p.pub_date = d.activity_date
    LEFT JOIN (
      SELECT DATE(submitted_at) as sub_date, COUNT(*) as deliveries_count
      FROM deliveries
      WHERE school_id = school_id_param
        AND submitted_at >= NOW() - (days_filter || ' days')::interval
      GROUP BY DATE(submitted_at)
    ) del ON del.sub_date = d.activity_date
  ) trend_data;

  v_result := jsonb_build_object(
    'students_at_risk_count', COALESCE(v_students_at_risk_count, 0),
    'avg_inactive_days', ROUND(v_avg_inactive_days, 1),
    'inactive_rate', ROUND(v_inactive_rate, 1),
    'total_students', v_total_students,
    'worst_class_name', v_worst_class_name,
    'worst_class_pending_count', COALESCE(v_worst_class_pending_count, 0),
    'activity_trend', COALESCE(v_activity_trend, '[]'::jsonb),
    'students_at_risk_list', COALESCE(v_students_list, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;
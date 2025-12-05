-- RPC para analytics de presença (usada nos insights preditivos)
CREATE OR REPLACE FUNCTION get_attendance_analytics(
  days_filter INTEGER DEFAULT 30,
  school_id_param UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Validar school_id
  IF school_id_param IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'school_id_param é obrigatório',
      'total_records', 0
    );
  END IF;

  -- Retornar analytics de presença
  SELECT jsonb_build_object(
    'total_records', COALESCE(COUNT(*), 0),
    'total_present', COALESCE(COUNT(*) FILTER (WHERE ca.status = 'PRESENTE'), 0),
    'total_absent', COALESCE(COUNT(*) FILTER (WHERE ca.status = 'FALTA'), 0),
    'total_justified', COALESCE(COUNT(*) FILTER (WHERE ca.status = 'JUSTIFICADA'), 0),
    'absence_rate', COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE ca.status = 'FALTA')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2
      ), 0
    ),
    'attendance_rate', COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE ca.status = 'PRESENTE')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2
      ), 0
    ),
    'students_with_high_absence', COALESCE((
      SELECT jsonb_agg(high_absence)
      FROM (
        SELECT 
          p.id as student_id,
          p.name as student_name,
          c.name as class_name,
          COUNT(*) as absence_count,
          ROUND(
            COUNT(*)::NUMERIC / NULLIF(
              (SELECT COUNT(*) FROM class_attendance ca3 
               WHERE ca3.student_id = ca2.student_id 
               AND ca3.date >= CURRENT_DATE - days_filter), 0
            ) * 100, 1
          ) as absence_percentage
        FROM class_attendance ca2
        JOIN profiles p ON p.id = ca2.student_id
        JOIN classes c ON c.id = ca2.class_id
        WHERE ca2.school_id = school_id_param
        AND ca2.status = 'FALTA'
        AND ca2.date >= CURRENT_DATE - days_filter
        GROUP BY ca2.student_id, p.id, p.name, c.name
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ) high_absence
    ), '[]'::jsonb),
    'classes_with_low_attendance', COALESCE((
      SELECT jsonb_agg(low_att)
      FROM (
        SELECT 
          c.id as class_id,
          c.name as class_name,
          COUNT(*) as total_records,
          COUNT(*) FILTER (WHERE ca2.status = 'PRESENTE') as present_count,
          ROUND(
            (COUNT(*) FILTER (WHERE ca2.status = 'PRESENTE'))::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1
          ) as attendance_rate
        FROM class_attendance ca2
        JOIN classes c ON c.id = ca2.class_id
        WHERE ca2.school_id = school_id_param
        AND ca2.date >= CURRENT_DATE - days_filter
        GROUP BY c.id, c.name
        HAVING (COUNT(*) FILTER (WHERE ca2.status = 'PRESENTE'))::NUMERIC / NULLIF(COUNT(*), 0) < 0.7
        ORDER BY attendance_rate ASC
        LIMIT 5
      ) low_att
    ), '[]'::jsonb),
    'daily_trend', COALESCE((
      SELECT jsonb_agg(daily ORDER BY date)
      FROM (
        SELECT 
          ca2.date::TEXT as date,
          COUNT(*) FILTER (WHERE ca2.status = 'PRESENTE') as present,
          COUNT(*) FILTER (WHERE ca2.status = 'FALTA') as absent,
          COUNT(*) FILTER (WHERE ca2.status = 'JUSTIFICADA') as justified
        FROM class_attendance ca2
        WHERE ca2.school_id = school_id_param
        AND ca2.date >= CURRENT_DATE - LEAST(days_filter, 14)
        GROUP BY ca2.date
        ORDER BY ca2.date DESC
        LIMIT 14
      ) daily
    ), '[]'::jsonb)
  ) INTO result
  FROM class_attendance ca
  WHERE ca.school_id = school_id_param
  AND ca.date >= CURRENT_DATE - days_filter;

  RETURN COALESCE(result, jsonb_build_object(
    'total_records', 0,
    'total_present', 0,
    'total_absent', 0,
    'total_justified', 0,
    'absence_rate', 0,
    'attendance_rate', 0,
    'students_with_high_absence', '[]'::jsonb,
    'classes_with_low_attendance', '[]'::jsonb,
    'daily_trend', '[]'::jsonb
  ));
END;
$$;
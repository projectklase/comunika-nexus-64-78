-- =====================================================
-- 1. FIX: get_class_performance_analytics (Performance por Turma)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_class_performance_analytics(p_class_id uuid, days_filter integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_role text;
  v_class_name text;
  v_class_school_id uuid;
  v_total_students int;
  v_active_students int;
  v_total_activities int;
  v_total_deliveries int;
  v_delivery_rate numeric;
  v_avg_days_to_deliver numeric;
  v_pending_deliveries int;
  v_approved_deliveries int;
  v_returned_deliveries int;
  v_late_deliveries int;
BEGIN
  -- Validação de segurança
  SELECT ur.role::text INTO v_caller_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
  
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('administrador', 'secretaria') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores e secretárias podem acessar analytics';
  END IF;

  IF p_class_id IS NULL THEN
    RAISE EXCEPTION 'class_id não pode ser nulo';
  END IF;

  -- Buscar dados da turma
  SELECT name, school_id INTO v_class_name, v_class_school_id
  FROM public.classes
  WHERE id = p_class_id;

  IF v_class_name IS NULL THEN
    RAISE EXCEPTION 'Turma não encontrada';
  END IF;

  -- Total de alunos na turma
  SELECT COUNT(DISTINCT cs.student_id)::int INTO v_total_students
  FROM public.class_students cs
  WHERE cs.class_id = p_class_id;

  -- Alunos ativos (com entrega nos últimos 7 dias)
  SELECT COUNT(DISTINCT d.student_id)::int INTO v_active_students
  FROM public.deliveries d
  WHERE d.class_id = p_class_id::text
    AND d.submitted_at >= (NOW() - INTERVAL '7 days');

  -- Total de atividades atribuídas à turma no período
  SELECT COUNT(DISTINCT p.id)::int INTO v_total_activities
  FROM public.posts p
  WHERE p.type IN ('ATIVIDADE', 'TRABALHO', 'PROVA')
    AND p.status = 'PUBLISHED'
    AND (p.class_id = p_class_id::text OR p_class_id::text = ANY(p.class_ids))
    AND p.created_at >= (NOW() - (days_filter || ' days')::interval);

  -- Total de entregas no período
  SELECT COUNT(*)::int INTO v_total_deliveries
  FROM public.deliveries d
  WHERE d.class_id = p_class_id::text
    AND d.submitted_at >= (NOW() - (days_filter || ' days')::interval);

  -- Taxa de entrega
  IF v_total_activities > 0 AND v_total_students > 0 THEN
    v_delivery_rate := ROUND((v_total_deliveries::numeric / (v_total_activities * v_total_students)::numeric) * 100, 2);
  ELSE
    v_delivery_rate := 0;
  END IF;

  -- Média de dias para entrega
  SELECT COALESCE(ROUND(AVG(
    EXTRACT(EPOCH FROM (d.submitted_at - p.created_at)) / 86400
  )::numeric, 1), 0) INTO v_avg_days_to_deliver
  FROM public.deliveries d
  INNER JOIN public.posts p ON p.id = d.post_id::uuid
  WHERE d.class_id = p_class_id::text
    AND d.submitted_at >= (NOW() - (days_filter || ' days')::interval);

  -- Entregas por status
  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE d.review_status = 'AGUARDANDO'), 0)::int,
    COALESCE(COUNT(*) FILTER (WHERE d.review_status = 'APROVADA'), 0)::int,
    COALESCE(COUNT(*) FILTER (WHERE d.review_status = 'DEVOLVIDA'), 0)::int,
    COALESCE(COUNT(*) FILTER (WHERE d.is_late = true), 0)::int
  INTO v_pending_deliveries, v_approved_deliveries, v_returned_deliveries, v_late_deliveries
  FROM public.deliveries d
  WHERE d.class_id = p_class_id::text
    AND d.submitted_at >= (NOW() - (days_filter || ' days')::interval);

  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'class_name', v_class_name,
    'total_students', COALESCE(v_total_students, 0),
    'active_students_last_7_days', COALESCE(v_active_students, 0),
    'total_activities_assigned', COALESCE(v_total_activities, 0),
    'total_deliveries', COALESCE(v_total_deliveries, 0),
    'delivery_rate', COALESCE(v_delivery_rate, 0),
    'avg_days_to_deliver', COALESCE(v_avg_days_to_deliver, 0),
    'pending_deliveries', COALESCE(v_pending_deliveries, 0),
    'approved_deliveries', COALESCE(v_approved_deliveries, 0),
    'returned_deliveries', COALESCE(v_returned_deliveries, 0),
    'late_deliveries', COALESCE(v_late_deliveries, 0)
  );
END;
$function$;

-- =====================================================
-- 2. FIX: get_evasion_risk_analytics (Tendência de Atividades + Dedupe Students)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_evasion_risk_analytics(school_id_param uuid, days_filter integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_students int;
  v_students_at_risk int;
  v_evasion_rate numeric;
  v_students_list jsonb;
  v_activity_trend jsonb;
BEGIN
  -- Total de alunos da escola
  SELECT COUNT(DISTINCT sm.user_id)::int INTO v_total_students
  FROM school_memberships sm
  WHERE sm.school_id = school_id_param AND sm.role = 'aluno';

  -- Alunos em risco (sem atividade nos últimos X dias) - COM DEDUPE
  WITH student_last_activity AS (
    SELECT 
      sm.user_id as student_id,
      p.name as student_name,
      p.avatar,
      c.name as class_name,
      c.id as class_id,
      MAX(d.submitted_at) as last_activity,
      EXTRACT(DAY FROM (NOW() - MAX(d.submitted_at)))::int as days_inactive
    FROM school_memberships sm
    INNER JOIN profiles p ON p.id = sm.user_id
    LEFT JOIN class_students cs ON cs.student_id = sm.user_id
    LEFT JOIN classes c ON c.id = cs.class_id
    LEFT JOIN deliveries d ON d.student_id = sm.user_id::text
    WHERE sm.school_id = school_id_param AND sm.role = 'aluno'
    GROUP BY sm.user_id, p.name, p.avatar, c.name, c.id
  ),
  deduplicated_students AS (
    SELECT DISTINCT ON (student_id)
      student_id,
      student_name,
      avatar,
      class_name,
      class_id,
      last_activity,
      days_inactive
    FROM student_last_activity
    ORDER BY student_id, days_inactive DESC NULLS FIRST
  )
  SELECT 
    COUNT(*)::int,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'student_id', student_id,
        'student_name', student_name,
        'avatar', avatar,
        'class_name', COALESCE(class_name, 'Sem turma'),
        'class_id', class_id,
        'last_activity', last_activity,
        'days_inactive', COALESCE(days_inactive, days_filter + 1),
        'risk_level', CASE 
          WHEN days_inactive IS NULL OR days_inactive > days_filter THEN 'critical'
          WHEN days_inactive > days_filter / 2 THEN 'high'
          ELSE 'medium'
        END
      ) ORDER BY days_inactive DESC NULLS FIRST
    ) FILTER (WHERE days_inactive IS NULL OR days_inactive > 7), '[]'::jsonb)
  INTO v_students_at_risk, v_students_list
  FROM deduplicated_students
  WHERE days_inactive IS NULL OR days_inactive > 7;

  -- Taxa de evasão
  IF v_total_students > 0 THEN
    v_evasion_rate := ROUND((v_students_at_risk::numeric / v_total_students::numeric) * 100, 2);
  ELSE
    v_evasion_rate := 0;
  END IF;

  -- REAL Activity Trend - últimos 30 dias com dados reais
  WITH date_series AS (
    SELECT generate_series(
      (CURRENT_DATE - (days_filter - 1)),
      CURRENT_DATE,
      '1 day'::interval
    )::date as date
  ),
  daily_activities AS (
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as activities_published
    FROM posts 
    WHERE school_id = school_id_param 
      AND type IN ('ATIVIDADE', 'TRABALHO', 'PROVA')
      AND status = 'PUBLISHED'
      AND created_at >= (NOW() - (days_filter || ' days')::interval)
    GROUP BY DATE(created_at)
  ),
  daily_deliveries AS (
    SELECT 
      DATE(submitted_at) as date,
      COUNT(*) as deliveries_made
    FROM deliveries
    WHERE school_id = school_id_param
      AND submitted_at >= (NOW() - (days_filter || ' days')::interval)
    GROUP BY DATE(submitted_at)
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', ds.date,
      'activities_published', COALESCE(da.activities_published, 0),
      'deliveries_made', COALESCE(dd.deliveries_made, 0)
    ) ORDER BY ds.date
  ), '[]'::jsonb) INTO v_activity_trend
  FROM date_series ds
  LEFT JOIN daily_activities da ON da.date = ds.date
  LEFT JOIN daily_deliveries dd ON dd.date = ds.date;

  RETURN jsonb_build_object(
    'total_students', COALESCE(v_total_students, 0),
    'students_at_risk', COALESCE(v_students_at_risk, 0),
    'evasion_rate', COALESCE(v_evasion_rate, 0),
    'students_at_risk_list', v_students_list,
    'activity_trend', v_activity_trend
  );
END;
$function$;

-- =====================================================
-- 3. FIX: get_post_read_analytics (top_posts, top_readers, read_rate_by_type)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_post_read_analytics(days_filter integer DEFAULT 30, school_id_param uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_posts int;
  v_total_reads int;
  v_unique_readers int;
  v_avg_read_rate numeric;
  v_top_posts jsonb;
  v_top_readers jsonb;
  v_read_rate_by_type jsonb;
  v_posts_with_low_engagement jsonb;
  v_total_students int;
BEGIN
  IF school_id_param IS NULL THEN
    RAISE EXCEPTION 'school_id_param é obrigatório';
  END IF;

  -- Total de alunos da escola
  SELECT COUNT(DISTINCT sm.user_id)::int INTO v_total_students
  FROM school_memberships sm
  WHERE sm.school_id = school_id_param AND sm.role = 'aluno';

  -- Total de posts publicados no período
  SELECT COUNT(*)::int INTO v_total_posts
  FROM posts p
  WHERE p.school_id = school_id_param
    AND p.status = 'PUBLISHED'
    AND p.created_at >= (NOW() - (days_filter || ' days')::interval);

  -- Total de leituras no período
  SELECT COUNT(*)::int INTO v_total_reads
  FROM post_reads pr
  INNER JOIN posts p ON p.id = pr.post_id
  WHERE p.school_id = school_id_param
    AND pr.read_at >= (NOW() - (days_filter || ' days')::interval);

  -- Leitores únicos
  SELECT COUNT(DISTINCT pr.user_id)::int INTO v_unique_readers
  FROM post_reads pr
  INNER JOIN posts p ON p.id = pr.post_id
  WHERE p.school_id = school_id_param
    AND pr.read_at >= (NOW() - (days_filter || ' days')::interval);

  -- Taxa média de leitura
  IF v_total_posts > 0 AND v_total_students > 0 THEN
    v_avg_read_rate := ROUND((v_total_reads::numeric / (v_total_posts * v_total_students)::numeric) * 100, 2);
  ELSE
    v_avg_read_rate := 0;
  END IF;

  -- TOP 10 POSTS mais lidos
  SELECT COALESCE(jsonb_agg(post_data ORDER BY total_reads DESC), '[]'::jsonb) INTO v_top_posts
  FROM (
    SELECT 
      p.id,
      p.title,
      p.type,
      COUNT(pr.id)::int as total_reads,
      COUNT(DISTINCT pr.user_id)::int as unique_readers,
      ROUND((COUNT(DISTINCT pr.user_id)::numeric / NULLIF(v_total_students, 0)::numeric) * 100, 2) as read_rate
    FROM posts p
    LEFT JOIN post_reads pr ON pr.post_id = p.id
    WHERE p.school_id = school_id_param
      AND p.status = 'PUBLISHED'
      AND p.created_at >= (NOW() - (days_filter || ' days')::interval)
    GROUP BY p.id, p.title, p.type
    ORDER BY COUNT(pr.id) DESC
    LIMIT 10
  ) post_data;

  -- TOP 10 READERS (alunos mais engajados)
  SELECT COALESCE(jsonb_agg(reader_data ORDER BY total_reads DESC), '[]'::jsonb) INTO v_top_readers
  FROM (
    SELECT 
      pr.user_id as student_id,
      prof.name as student_name,
      prof.avatar,
      COUNT(pr.id)::int as total_reads,
      COUNT(DISTINCT pr.post_id)::int as unique_posts_read
    FROM post_reads pr
    INNER JOIN posts p ON p.id = pr.post_id
    INNER JOIN profiles prof ON prof.id = pr.user_id
    WHERE p.school_id = school_id_param
      AND pr.read_at >= (NOW() - (days_filter || ' days')::interval)
    GROUP BY pr.user_id, prof.name, prof.avatar
    ORDER BY COUNT(pr.id) DESC
    LIMIT 10
  ) reader_data;

  -- Read Rate by Post Type
  SELECT COALESCE(jsonb_agg(type_data), '[]'::jsonb) INTO v_read_rate_by_type
  FROM (
    SELECT 
      p.type,
      COUNT(DISTINCT p.id)::int as total_posts,
      COUNT(pr.id)::int as total_reads,
      COUNT(DISTINCT pr.user_id)::int as unique_readers,
      ROUND(
        (COUNT(DISTINCT pr.user_id)::numeric / NULLIF(COUNT(DISTINCT p.id) * v_total_students, 0)::numeric) * 100, 
        2
      ) as avg_read_rate
    FROM posts p
    LEFT JOIN post_reads pr ON pr.post_id = p.id
    WHERE p.school_id = school_id_param
      AND p.status = 'PUBLISHED'
      AND p.created_at >= (NOW() - (days_filter || ' days')::interval)
    GROUP BY p.type
    ORDER BY avg_read_rate DESC
  ) type_data;

  -- Posts com baixo engajamento (< 30% de leitura)
  SELECT COALESCE(jsonb_agg(low_eng ORDER BY read_rate ASC), '[]'::jsonb) INTO v_posts_with_low_engagement
  FROM (
    SELECT 
      p.id,
      p.title,
      p.type,
      p.created_at,
      COUNT(DISTINCT pr.user_id)::int as unique_readers,
      ROUND((COUNT(DISTINCT pr.user_id)::numeric / NULLIF(v_total_students, 0)::numeric) * 100, 2) as read_rate
    FROM posts p
    LEFT JOIN post_reads pr ON pr.post_id = p.id
    WHERE p.school_id = school_id_param
      AND p.status = 'PUBLISHED'
      AND p.created_at >= (NOW() - (days_filter || ' days')::interval)
    GROUP BY p.id, p.title, p.type, p.created_at
    HAVING ROUND((COUNT(DISTINCT pr.user_id)::numeric / NULLIF(v_total_students, 0)::numeric) * 100, 2) < 30
    ORDER BY read_rate ASC
    LIMIT 10
  ) low_eng;

  RETURN jsonb_build_object(
    'total_posts', COALESCE(v_total_posts, 0),
    'total_reads', COALESCE(v_total_reads, 0),
    'unique_readers', COALESCE(v_unique_readers, 0),
    'avg_read_rate', COALESCE(v_avg_read_rate, 0),
    'total_students', COALESCE(v_total_students, 0),
    'top_posts', v_top_posts,
    'top_readers', v_top_readers,
    'read_rate_by_type', v_read_rate_by_type,
    'posts_with_low_engagement', v_posts_with_low_engagement
  );
END;
$function$;
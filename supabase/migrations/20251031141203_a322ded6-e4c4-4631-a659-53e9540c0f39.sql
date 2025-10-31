-- ============================================================
-- FIX: Permitir Edge Functions com Service Role chamarem Analytics
-- ============================================================
-- Problema: get_evasion_risk_analytics e get_post_read_analytics
-- validam auth.uid() que retorna NULL quando chamado via Service Role
-- Solução: Checar se é Service Role (auth.jwt() ->> 'role' = 'service_role')
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_evasion_risk_analytics(days_filter integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_role text;
  v_jwt_role text;
  v_result jsonb;
  v_students_at_risk jsonb;
  v_students_at_risk_count int;
  v_activity_trend jsonb;
  v_worst_class_name text;
  v_worst_class_count int;
BEGIN
  -- ✅ NOVA VALIDAÇÃO: Aceitar Service Role OU Administrador
  v_jwt_role := current_setting('request.jwt.claims', true)::json->>'role';
  
  IF v_jwt_role = 'service_role' THEN
    -- Service Role bypassa validação (usado por Edge Functions)
    NULL;
  ELSE
    -- Validar role de administrador para chamadas normais
    SELECT ur.role::text INTO v_caller_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    LIMIT 1;
    
    IF v_caller_role IS NULL OR v_caller_role != 'administrador' THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar analytics'
        USING HINT = 'Você precisa ter o role "administrador" para chamar esta função';
    END IF;
  END IF;

  -- ✅ QUERY ÚNICA COM TODAS AS CTEs (sem mudanças)
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
$function$;

-- ============================================================
-- FIX: get_post_read_analytics
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_post_read_analytics(days_filter integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_role TEXT;
  v_jwt_role TEXT;
  v_total_posts INT;
  v_total_reads INT;
  v_avg_read_rate NUMERIC;
  v_total_students INT;
  v_top_posts JSONB;
  v_read_rate_by_type JSONB;
  v_top_readers JSONB;
  v_low_engagement_posts JSONB;
BEGIN
  -- ✅ NOVA VALIDAÇÃO: Aceitar Service Role OU Administrador
  v_jwt_role := current_setting('request.jwt.claims', true)::json->>'role';
  
  IF v_jwt_role = 'service_role' THEN
    -- Service Role bypassa validação (usado por Edge Functions)
    NULL;
  ELSE
    -- Validar role de administrador para chamadas normais
    SELECT ur.role::TEXT INTO v_caller_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    LIMIT 1;
    
    IF v_caller_role IS NULL OR v_caller_role != 'administrador' THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar analytics'
        USING HINT = 'Você precisa ter o role "administrador" para chamar esta função';
    END IF;
  END IF;

  -- Total de alunos ativos
  SELECT COUNT(DISTINCT p.id)::INT INTO v_total_students
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'aluno'
  WHERE p.is_active = true;

  -- Total de posts publicados no período
  SELECT COUNT(*)::INT INTO v_total_posts
  FROM posts
  WHERE status = 'PUBLISHED'
    AND created_at >= (NOW() - days_filter * INTERVAL '1 day');

  -- Total de leituras no período
  SELECT COUNT(*)::INT INTO v_total_reads
  FROM post_reads pr
  INNER JOIN posts p ON p.id = pr.post_id
  WHERE p.status = 'PUBLISHED'
    AND pr.read_at >= (NOW() - days_filter * INTERVAL '1 day');

  -- Taxa média de leitura
  IF v_total_posts > 0 AND v_total_students > 0 THEN
    v_avg_read_rate := ROUND((v_total_reads::NUMERIC / (v_total_posts * v_total_students)::NUMERIC) * 100, 2);
  ELSE
    v_avg_read_rate := 0;
  END IF;

  -- Top 10 posts mais lidos
  WITH top_posts_cte AS (
    SELECT 
      p.id::TEXT AS post_id,
      p.title AS post_title,
      p.type AS post_type,
      COUNT(pr.id)::INT AS total_reads,
      COUNT(DISTINCT pr.user_id)::INT AS unique_readers,
      CASE 
        WHEN v_total_students > 0 THEN 
          ROUND((COUNT(DISTINCT pr.user_id)::NUMERIC / v_total_students::NUMERIC) * 100, 2)
        ELSE 0
      END AS read_rate,
      c.name AS class_name
    FROM posts p
    LEFT JOIN post_reads pr ON pr.post_id = p.id
    LEFT JOIN classes c ON c.id::TEXT = ANY(p.class_ids)
    WHERE p.status = 'PUBLISHED'
      AND p.created_at >= (NOW() - days_filter * INTERVAL '1 day')
    GROUP BY p.id, p.title, p.type, c.name
    ORDER BY total_reads DESC, unique_readers DESC
    LIMIT 10
  )
  SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::JSONB) INTO v_top_posts
  FROM top_posts_cte t;

  -- Taxa de leitura por tipo de post
  WITH read_rate_by_type_cte AS (
    SELECT 
      p.type AS post_type,
      COUNT(DISTINCT p.id)::INT AS total_posts,
      COUNT(pr.id)::INT AS total_reads,
      CASE 
        WHEN COUNT(DISTINCT p.id) > 0 AND v_total_students > 0 THEN
          ROUND((COUNT(pr.id)::NUMERIC / (COUNT(DISTINCT p.id) * v_total_students)::NUMERIC) * 100, 2)
        ELSE 0
      END AS avg_read_rate
    FROM posts p
    LEFT JOIN post_reads pr ON pr.post_id = p.id
    WHERE p.status = 'PUBLISHED'
      AND p.created_at >= (NOW() - days_filter * INTERVAL '1 day')
    GROUP BY p.type
    ORDER BY avg_read_rate DESC
  )
  SELECT COALESCE(jsonb_agg(row_to_json(r.*)), '[]'::JSONB) INTO v_read_rate_by_type
  FROM read_rate_by_type_cte r;

  -- Top 10 alunos mais engajados
  WITH top_readers_cte AS (
    SELECT 
      prof.id::TEXT AS student_id,
      prof.name AS student_name,
      c.name AS class_name,
      COUNT(pr.id)::INT AS total_reads
    FROM post_reads pr
    INNER JOIN profiles prof ON prof.id = pr.user_id
    INNER JOIN user_roles ur ON ur.user_id = prof.id AND ur.role = 'aluno'
    LEFT JOIN class_students cs ON cs.student_id = prof.id
    LEFT JOIN classes c ON c.id = cs.class_id
    INNER JOIN posts p ON p.id = pr.post_id
    WHERE prof.is_active = true
      AND p.status = 'PUBLISHED'
      AND pr.read_at >= (NOW() - days_filter * INTERVAL '1 day')
    GROUP BY prof.id, prof.name, c.name
    ORDER BY total_reads DESC
    LIMIT 10
  )
  SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::JSONB) INTO v_top_readers
  FROM top_readers_cte t;

  -- Posts com baixo engajamento (menos de 30% de leitura)
  WITH low_engagement_cte AS (
    SELECT 
      p.id::TEXT AS post_id,
      p.title AS post_title,
      p.type AS post_type,
      COUNT(pr.id)::INT AS total_reads,
      COUNT(DISTINCT pr.user_id)::INT AS unique_readers,
      CASE 
        WHEN v_total_students > 0 THEN 
          ROUND((COUNT(DISTINCT pr.user_id)::NUMERIC / v_total_students::NUMERIC) * 100, 2)
        ELSE 0
      END AS read_rate,
      c.name AS class_name
    FROM posts p
    LEFT JOIN post_reads pr ON pr.post_id = p.id
    LEFT JOIN classes c ON c.id::TEXT = ANY(p.class_ids)
    WHERE p.status = 'PUBLISHED'
      AND p.created_at >= (NOW() - days_filter * INTERVAL '1 day')
    GROUP BY p.id, p.title, p.type, c.name
    HAVING CASE 
      WHEN v_total_students > 0 THEN 
        ROUND((COUNT(DISTINCT pr.user_id)::NUMERIC / v_total_students::NUMERIC) * 100, 2)
      ELSE 0
    END < 30
    ORDER BY read_rate ASC
    LIMIT 10
  )
  SELECT COALESCE(jsonb_agg(row_to_json(l.*)), '[]'::JSONB) INTO v_low_engagement_posts
  FROM low_engagement_cte l;

  -- Retornar JSON consolidado
  RETURN jsonb_build_object(
    'total_posts_published', COALESCE(v_total_posts, 0),
    'total_reads', COALESCE(v_total_reads, 0),
    'avg_read_rate', COALESCE(v_avg_read_rate, 0),
    'top_posts', v_top_posts,
    'read_rate_by_type', v_read_rate_by_type,
    'top_readers', v_top_readers,
    'posts_with_low_engagement', v_low_engagement_posts
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao processar analytics de leituras: %', SQLERRM
      USING HINT = 'Verifique os logs do servidor para mais detalhes';
END;
$function$;
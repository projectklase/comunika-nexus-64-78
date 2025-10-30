-- ✅ FASE 4: Função RPC para análise de engajamento de posts
CREATE OR REPLACE FUNCTION public.get_post_read_analytics(days_filter INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_total_posts INT;
  v_total_reads INT;
  v_avg_read_rate NUMERIC;
  v_total_students INT;
  v_top_posts JSONB;
  v_read_rate_by_type JSONB;
  v_top_readers JSONB;
  v_low_engagement_posts JSONB;
BEGIN
  -- ✅ VALIDAÇÃO DE SEGURANÇA
  SELECT ur.role::TEXT INTO v_caller_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
  
  IF v_caller_role IS NULL OR v_caller_role != 'administrador' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar analytics'
      USING HINT = 'Você precisa ter o role "administrador" para chamar esta função';
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
$$;

-- ✅ Permissões seguras
REVOKE EXECUTE ON FUNCTION public.get_post_read_analytics(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_post_read_analytics(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_post_read_analytics IS 'Retorna analytics detalhadas de leituras de posts (apenas para administradores)';

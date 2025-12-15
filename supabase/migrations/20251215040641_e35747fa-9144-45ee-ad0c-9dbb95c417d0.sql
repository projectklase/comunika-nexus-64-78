-- Remover versões antigas de get_post_read_analytics
DROP FUNCTION IF EXISTS public.get_post_read_analytics(integer, uuid);
DROP FUNCTION IF EXISTS public.get_post_read_analytics(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_post_read_analytics(
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
  v_total_posts integer;
  v_total_reads integer;
  v_avg_read_rate numeric;
  v_top_posts jsonb;
  v_read_rate_by_type jsonb;
  v_top_readers jsonb;
  v_low_engagement_posts jsonb;
  v_total_students integer;
BEGIN
  -- Contar alunos da escola
  SELECT COUNT(*) INTO v_total_students
  FROM school_memberships 
  WHERE school_id = school_id_param AND role = 'aluno';

  -- Total de posts publicados no período
  SELECT COUNT(*) INTO v_total_posts
  FROM posts
  WHERE school_id = school_id_param
    AND status = 'PUBLISHED'
    AND created_at >= NOW() - (days_filter || ' days')::interval;

  -- Total de leituras
  SELECT COUNT(*) INTO v_total_reads
  FROM post_reads pr
  JOIN posts p ON p.id = pr.post_id
  WHERE p.school_id = school_id_param
    AND pr.read_at >= NOW() - (days_filter || ' days')::interval;

  -- Taxa média de leitura
  v_avg_read_rate := CASE WHEN v_total_posts > 0 AND v_total_students > 0
    THEN (v_total_reads::numeric / (v_total_posts * v_total_students)::numeric) * 100
    ELSE 0
  END;

  -- Top 10 posts mais lidos
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'post_id', post_id,
      'post_title', post_title,
      'post_type', post_type,
      'total_reads', total_reads,
      'unique_readers', unique_readers,
      'read_rate', read_rate,
      'class_name', class_name
    )
    ORDER BY total_reads DESC
  ), '[]'::jsonb)
  INTO v_top_posts
  FROM (
    SELECT 
      p.id as post_id,
      p.title as post_title,
      p.type as post_type,
      COUNT(pr.id) as total_reads,
      COUNT(DISTINCT pr.user_id) as unique_readers,
      CASE WHEN v_total_students > 0 
        THEN ROUND((COUNT(DISTINCT pr.user_id)::numeric / v_total_students::numeric) * 100, 1)
        ELSE 0 
      END as read_rate,
      c.name as class_name
    FROM posts p
    LEFT JOIN post_reads pr ON pr.post_id = p.id
    LEFT JOIN classes c ON c.id::text = p.class_id
    WHERE p.school_id = school_id_param
      AND p.status = 'PUBLISHED'
      AND p.created_at >= NOW() - (days_filter || ' days')::interval
    GROUP BY p.id, p.title, p.type, c.name
    ORDER BY total_reads DESC
    LIMIT 10
  ) top;

  -- Taxa de leitura por tipo de post (post_type em vez de type)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'post_type', post_type,
      'total_posts', total_posts,
      'total_reads', total_reads,
      'avg_read_rate', avg_read_rate
    )
  ), '[]'::jsonb)
  INTO v_read_rate_by_type
  FROM (
    SELECT 
      p.type as post_type,
      COUNT(DISTINCT p.id) as total_posts,
      COUNT(pr.id) as total_reads,
      CASE WHEN COUNT(DISTINCT p.id) > 0 AND v_total_students > 0
        THEN ROUND((COUNT(DISTINCT pr.user_id)::numeric / (COUNT(DISTINCT p.id) * v_total_students)::numeric) * 100, 1)
        ELSE 0
      END as avg_read_rate
    FROM posts p
    LEFT JOIN post_reads pr ON pr.post_id = p.id
    WHERE p.school_id = school_id_param
      AND p.status = 'PUBLISHED'
      AND p.created_at >= NOW() - (days_filter || ' days')::interval
    GROUP BY p.type
  ) by_type;

  -- Top 10 leitores
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'student_id', student_id,
      'student_name', student_name,
      'class_name', class_name,
      'total_reads', total_reads
    )
    ORDER BY total_reads DESC
  ), '[]'::jsonb)
  INTO v_top_readers
  FROM (
    SELECT 
      pr.user_id as student_id,
      prof.name as student_name,
      c.name as class_name,
      COUNT(*) as total_reads
    FROM post_reads pr
    JOIN posts p ON p.id = pr.post_id
    JOIN profiles prof ON prof.id = pr.user_id
    LEFT JOIN class_students cs ON cs.student_id = pr.user_id
    LEFT JOIN classes c ON c.id = cs.class_id
    WHERE p.school_id = school_id_param
      AND pr.read_at >= NOW() - (days_filter || ' days')::interval
    GROUP BY pr.user_id, prof.name, c.name
    ORDER BY total_reads DESC
    LIMIT 10
  ) readers;

  -- Posts com baixo engajamento (< 20% de leitura)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'post_id', post_id,
      'post_title', post_title,
      'post_type', post_type,
      'total_reads', total_reads,
      'unique_readers', unique_readers,
      'read_rate', read_rate,
      'class_name', class_name
    )
    ORDER BY read_rate ASC
  ), '[]'::jsonb)
  INTO v_low_engagement_posts
  FROM (
    SELECT 
      p.id as post_id,
      p.title as post_title,
      p.type as post_type,
      COUNT(pr.id) as total_reads,
      COUNT(DISTINCT pr.user_id) as unique_readers,
      CASE WHEN v_total_students > 0 
        THEN ROUND((COUNT(DISTINCT pr.user_id)::numeric / v_total_students::numeric) * 100, 1)
        ELSE 0 
      END as read_rate,
      c.name as class_name
    FROM posts p
    LEFT JOIN post_reads pr ON pr.post_id = p.id
    LEFT JOIN classes c ON c.id::text = p.class_id
    WHERE p.school_id = school_id_param
      AND p.status = 'PUBLISHED'
      AND p.created_at >= NOW() - (days_filter || ' days')::interval
    GROUP BY p.id, p.title, p.type, c.name
    HAVING CASE WHEN v_total_students > 0 
      THEN (COUNT(DISTINCT pr.user_id)::numeric / v_total_students::numeric) * 100
      ELSE 0 
    END < 20
    ORDER BY read_rate ASC
    LIMIT 10
  ) low_engagement;

  -- Retornar com nomes corretos para TypeScript
  v_result := jsonb_build_object(
    'total_posts_published', v_total_posts,
    'total_reads', v_total_reads,
    'avg_read_rate', ROUND(COALESCE(v_avg_read_rate, 0), 1),
    'top_posts', v_top_posts,
    'read_rate_by_type', v_read_rate_by_type,
    'top_readers', v_top_readers,
    'posts_with_low_engagement', v_low_engagement_posts
  );

  RETURN v_result;
END;
$$;
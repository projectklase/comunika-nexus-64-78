-- RPC para buscar rankings de alunos por escola
CREATE OR REPLACE FUNCTION get_school_rankings(
  school_id_param UUID,
  ranking_type TEXT DEFAULT 'xp',
  limit_param INT DEFAULT 10
)
RETURNS TABLE(
  student_id UUID,
  student_name TEXT,
  avatar TEXT,
  total_xp INT,
  koins INT,
  current_streak_days INT,
  rank_position BIGINT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar tipo de ranking
  IF ranking_type NOT IN ('xp', 'koins', 'streak') THEN
    RAISE EXCEPTION 'Invalid ranking_type. Must be xp, koins, or streak';
  END IF;

  -- Retornar ranking baseado no tipo
  RETURN QUERY
  WITH ranked_students AS (
    SELECT 
      p.id,
      p.name,
      p.avatar,
      COALESCE(p.total_xp, 0) as xp,
      COALESCE(p.koins, 0) as koin_count,
      COALESCE(p.current_streak_days, 0) as streak,
      CASE 
        WHEN ranking_type = 'xp' THEN ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.name ASC)
        WHEN ranking_type = 'koins' THEN ROW_NUMBER() OVER (ORDER BY COALESCE(p.koins, 0) DESC, p.name ASC)
        WHEN ranking_type = 'streak' THEN ROW_NUMBER() OVER (ORDER BY COALESCE(p.current_streak_days, 0) DESC, p.name ASC)
      END as position
    FROM profiles p
    INNER JOIN school_memberships sm ON sm.user_id = p.id
    WHERE sm.school_id = school_id_param
      AND sm.role = 'aluno'
      AND p.is_active = true
  )
  SELECT 
    rs.id::UUID,
    rs.name::TEXT,
    rs.avatar::TEXT,
    rs.xp::INT,
    rs.koin_count::INT,
    rs.streak::INT,
    rs.position::BIGINT
  FROM ranked_students rs
  ORDER BY rs.position ASC
  LIMIT limit_param;
END;
$$;

-- Permitir alunos chamarem a função
GRANT EXECUTE ON FUNCTION get_school_rankings TO authenticated;
-- Criar RPC para buscar perfil público de gamificação (apenas dados públicos)
CREATE OR REPLACE FUNCTION get_public_student_profile(student_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  total_xp INTEGER,
  koins INTEGER,
  current_streak_days INTEGER,
  best_streak_days INTEGER,
  equipped_avatar_emoji TEXT,
  equipped_avatar_rarity TEXT,
  equipped_avatar_image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    COALESCE(p.total_xp, 0)::INTEGER,
    COALESCE(p.koins, 0)::INTEGER,
    COALESCE(p.current_streak_days, 0)::INTEGER,
    COALESCE(p.best_streak_days, 0)::INTEGER,
    (u.preview_data->>'emoji')::TEXT,
    u.rarity::TEXT,
    (u.preview_data->>'imageUrl')::TEXT
  FROM profiles p
  LEFT JOIN user_unlocks uu ON uu.user_id = p.id AND uu.is_equipped = true
  LEFT JOIN unlockables u ON u.id = uu.unlockable_id AND u.type = 'AVATAR'
  WHERE p.id = student_id_param;
END;
$$;

-- Dropar função antiga de rankings
DROP FUNCTION IF EXISTS get_school_rankings(UUID, TEXT, INTEGER);

-- Recriar função de rankings com campos de avatar equipado
CREATE OR REPLACE FUNCTION get_school_rankings(
  school_id_param UUID,
  ranking_type TEXT DEFAULT 'xp',
  limit_param INTEGER DEFAULT 10
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  avatar TEXT,
  total_xp INTEGER,
  koins INTEGER,
  current_streak_days INTEGER,
  rank_position BIGINT,
  equipped_avatar_emoji TEXT,
  equipped_avatar_rarity TEXT,
  equipped_avatar_image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF ranking_type NOT IN ('xp', 'koins', 'streak') THEN
    RAISE EXCEPTION 'Invalid ranking_type. Must be xp, koins, or streak';
  END IF;

  RETURN QUERY
  WITH ranked_students AS (
    SELECT 
      p.id,
      p.name,
      p.avatar,
      COALESCE(p.total_xp, 0) as xp,
      COALESCE(p.koins, 0) as koin_count,
      COALESCE(p.current_streak_days, 0) as streak,
      (u.preview_data->>'emoji')::TEXT as avatar_emoji,
      u.rarity::TEXT as avatar_rarity,
      (u.preview_data->>'imageUrl')::TEXT as avatar_image_url,
      CASE 
        WHEN ranking_type = 'xp' THEN ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC, p.name ASC)
        WHEN ranking_type = 'koins' THEN ROW_NUMBER() OVER (ORDER BY COALESCE(p.koins, 0) DESC, p.name ASC)
        WHEN ranking_type = 'streak' THEN ROW_NUMBER() OVER (ORDER BY COALESCE(p.current_streak_days, 0) DESC, p.name ASC)
      END as position
    FROM profiles p
    INNER JOIN school_memberships sm ON sm.user_id = p.id
    LEFT JOIN user_unlocks uu ON uu.user_id = p.id AND uu.is_equipped = true
    LEFT JOIN unlockables u ON u.id = uu.unlockable_id AND u.type = 'AVATAR'
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
    rs.position::BIGINT,
    rs.avatar_emoji::TEXT,
    rs.avatar_rarity::TEXT,
    rs.avatar_image_url::TEXT
  FROM ranked_students rs
  ORDER BY rs.position ASC
  LIMIT limit_param;
END;
$$;
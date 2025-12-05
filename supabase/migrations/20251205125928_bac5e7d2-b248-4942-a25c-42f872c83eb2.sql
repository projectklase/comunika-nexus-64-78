-- Drop existing functions to change return types
DROP FUNCTION IF EXISTS public.get_public_student_profile(UUID);
DROP FUNCTION IF EXISTS public.get_school_rankings(UUID, TEXT, INTEGER);

-- Fix get_public_student_profile to use subqueries (prevents duplication from multiple equipped items)
CREATE OR REPLACE FUNCTION public.get_public_student_profile(student_id_param UUID)
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
    -- Subqueries garantem 1 valor por aluno (evita duplicação)
    (
      SELECT (u.preview_data->>'emoji')::TEXT
      FROM user_unlocks uu
      JOIN unlockables u ON u.id = uu.unlockable_id
      WHERE uu.user_id = p.id AND uu.is_equipped = true AND u.type = 'AVATAR'
      LIMIT 1
    ) as equipped_avatar_emoji,
    (
      SELECT u.rarity::TEXT
      FROM user_unlocks uu
      JOIN unlockables u ON u.id = uu.unlockable_id
      WHERE uu.user_id = p.id AND uu.is_equipped = true AND u.type = 'AVATAR'
      LIMIT 1
    ) as equipped_avatar_rarity,
    (
      SELECT (u.preview_data->>'imageUrl')::TEXT
      FROM user_unlocks uu
      JOIN unlockables u ON u.id = uu.unlockable_id
      WHERE uu.user_id = p.id AND uu.is_equipped = true AND u.type = 'AVATAR'
      LIMIT 1
    ) as equipped_avatar_image_url
  FROM profiles p
  WHERE p.id = student_id_param;
END;
$$;

-- Fix get_school_rankings to use subqueries (prevents duplicate entries from multiple equipped items)
CREATE OR REPLACE FUNCTION public.get_school_rankings(
  school_id_param UUID,
  ranking_type TEXT DEFAULT 'xp',
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  avatar TEXT,
  total_xp BIGINT,
  koins BIGINT,
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
  RETURN QUERY
  WITH ranked_students AS (
    SELECT 
      p.id,
      p.name,
      p.avatar,
      COALESCE(p.total_xp, 0) as xp,
      COALESCE(p.koins, 0) as koin_count,
      COALESCE(p.current_streak_days, 0) as streak,
      -- Subqueries garantem 1 valor por aluno
      (
        SELECT (u.preview_data->>'emoji')::TEXT
        FROM user_unlocks uu
        JOIN unlockables u ON u.id = uu.unlockable_id
        WHERE uu.user_id = p.id AND uu.is_equipped = true AND u.type = 'AVATAR'
        LIMIT 1
      ) as avatar_emoji,
      (
        SELECT u.rarity::TEXT
        FROM user_unlocks uu
        JOIN unlockables u ON u.id = uu.unlockable_id
        WHERE uu.user_id = p.id AND uu.is_equipped = true AND u.type = 'AVATAR'
        LIMIT 1
      ) as avatar_rarity,
      (
        SELECT (u.preview_data->>'imageUrl')::TEXT
        FROM user_unlocks uu
        JOIN unlockables u ON u.id = uu.unlockable_id
        WHERE uu.user_id = p.id AND uu.is_equipped = true AND u.type = 'AVATAR'
        LIMIT 1
      ) as avatar_image_url,
      CASE ranking_type
        WHEN 'xp' THEN ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC)
        WHEN 'koins' THEN ROW_NUMBER() OVER (ORDER BY COALESCE(p.koins, 0) DESC)
        WHEN 'streak' THEN ROW_NUMBER() OVER (ORDER BY COALESCE(p.current_streak_days, 0) DESC)
        ELSE ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC)
      END as position
    FROM profiles p
    INNER JOIN school_memberships sm ON sm.user_id = p.id
    WHERE sm.school_id = school_id_param
      AND sm.role = 'aluno'
      AND p.is_active = true
  )
  SELECT 
    rs.id as student_id,
    rs.name as student_name,
    rs.avatar,
    rs.xp as total_xp,
    rs.koin_count as koins,
    rs.streak as current_streak_days,
    rs.position as rank_position,
    rs.avatar_emoji as equipped_avatar_emoji,
    rs.avatar_rarity as equipped_avatar_rarity,
    rs.avatar_image_url as equipped_avatar_image_url
  FROM ranked_students rs
  ORDER BY rs.position
  LIMIT limit_count;
END;
$$;
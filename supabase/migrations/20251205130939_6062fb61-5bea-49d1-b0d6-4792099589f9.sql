-- Drop existing broken functions
DROP FUNCTION IF EXISTS public.get_school_rankings(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_public_student_profile(UUID);

-- Restore get_school_rankings with correct INTEGER types and DISTINCT ON
CREATE OR REPLACE FUNCTION public.get_school_rankings(
  school_id_param UUID,
  ranking_type TEXT DEFAULT 'xp',
  limit_count INTEGER DEFAULT 10
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
  RETURN QUERY
  WITH base_students AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.name,
      p.avatar,
      COALESCE(p.total_xp, 0)::INTEGER as xp,
      COALESCE(p.koins, 0)::INTEGER as koin_count,
      COALESCE(p.current_streak_days, 0)::INTEGER as streak,
      (u.preview_data->>'emoji')::TEXT as avatar_emoji,
      u.rarity::TEXT as avatar_rarity,
      (u.preview_data->>'imageUrl')::TEXT as avatar_image_url
    FROM profiles p
    INNER JOIN school_memberships sm ON sm.user_id = p.id
    LEFT JOIN user_unlocks uu ON uu.user_id = p.id AND uu.is_equipped = true
    LEFT JOIN unlockables u ON u.id = uu.unlockable_id AND u.type = 'AVATAR'
    WHERE sm.school_id = school_id_param
      AND sm.role = 'aluno'
      AND p.is_active = true
    ORDER BY p.id, u.rarity DESC NULLS LAST
  ),
  ranked_students AS (
    SELECT
      bs.*,
      ROW_NUMBER() OVER (
        ORDER BY
          CASE ranking_type
            WHEN 'xp' THEN bs.xp
            WHEN 'koins' THEN bs.koin_count
            WHEN 'streak' THEN bs.streak
            ELSE bs.xp
          END DESC
      ) as position
    FROM base_students bs
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

-- Restore get_public_student_profile with correct types and DISTINCT ON
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
  SELECT DISTINCT ON (p.id)
    p.id,
    p.name::TEXT,
    COALESCE(p.total_xp, 0)::INTEGER,
    COALESCE(p.koins, 0)::INTEGER,
    COALESCE(p.current_streak_days, 0)::INTEGER,
    COALESCE(p.best_streak_days, 0)::INTEGER,
    (u.preview_data->>'emoji')::TEXT as equipped_avatar_emoji,
    u.rarity::TEXT as equipped_avatar_rarity,
    (u.preview_data->>'imageUrl')::TEXT as equipped_avatar_image_url
  FROM profiles p
  LEFT JOIN user_unlocks uu ON uu.user_id = p.id AND uu.is_equipped = true
  LEFT JOIN unlockables u ON u.id = uu.unlockable_id AND u.type = 'AVATAR'
  WHERE p.id = student_id_param
  ORDER BY p.id, u.rarity DESC NULLS LAST
  LIMIT 1;
END;
$$;
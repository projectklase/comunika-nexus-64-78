-- Drop existing function and recreate with correct avatar fields
DROP FUNCTION IF EXISTS public.get_weekly_xp_rankings(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_weekly_xp_rankings(p_school_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  avatar text,
  weekly_xp bigint,
  rank_position bigint,
  equipped_avatar_emoji text,
  equipped_avatar_rarity text,
  equipped_avatar_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
BEGIN
  -- Calculate current week start (Monday)
  v_week_start := get_week_start(CURRENT_DATE);
  
  RETURN QUERY
  WITH weekly_totals AS (
    SELECT 
      wxl.user_id,
      SUM(wxl.xp_earned) as total_weekly_xp
    FROM weekly_xp_log wxl
    WHERE wxl.school_id = p_school_id
      AND wxl.week_start = v_week_start
    GROUP BY wxl.user_id
  ),
  user_avatars AS (
    SELECT 
      uu.user_id,
      (u.preview_data->>'emoji')::TEXT as emoji,
      u.rarity,
      (u.preview_data->>'imageUrl')::TEXT as image_url
    FROM user_unlocks uu
    JOIN unlockables u ON u.id = uu.unlockable_id
    WHERE uu.is_equipped = true AND u.type = 'AVATAR'
  ),
  ranked AS (
    SELECT 
      wt.user_id as student_id,
      p.name as student_name,
      p.avatar,
      wt.total_weekly_xp as weekly_xp,
      ROW_NUMBER() OVER (ORDER BY wt.total_weekly_xp DESC) as rank_position,
      ua.emoji as equipped_avatar_emoji,
      ua.rarity as equipped_avatar_rarity,
      ua.image_url as equipped_avatar_image_url
    FROM weekly_totals wt
    JOIN profiles p ON p.id = wt.user_id
    LEFT JOIN user_avatars ua ON ua.user_id = wt.user_id
    WHERE wt.total_weekly_xp > 0
  )
  SELECT 
    r.student_id,
    r.student_name,
    r.avatar,
    r.weekly_xp,
    r.rank_position,
    r.equipped_avatar_emoji,
    r.equipped_avatar_rarity,
    r.equipped_avatar_image_url
  FROM ranked r
  ORDER BY r.rank_position
  LIMIT p_limit;
END;
$$;
-- Fix get_last_weekly_prize_results function: correct column names
-- weekly_xp_log uses xp_earned (not xp_amount) and earned_at (not created_at)
-- Need to DROP first since return type may differ

DROP FUNCTION IF EXISTS public.get_last_weekly_prize_results(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_last_weekly_prize_results(
  p_school_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_week_start DATE;
  v_already_viewed BOOLEAN;
  v_winners JSONB;
  v_my_position INT;
  v_my_prize INT;
BEGIN
  -- Get the start of last week (Monday 00:00)
  v_last_week_start := date_trunc('week', CURRENT_DATE - INTERVAL '1 day')::DATE;
  
  -- Check if user already viewed this week's results
  SELECT EXISTS (
    SELECT 1 FROM weekly_prize_views 
    WHERE user_id = p_user_id 
    AND school_id = p_school_id
    AND week_start = v_last_week_start
  ) INTO v_already_viewed;
  
  IF v_already_viewed THEN
    RETURN jsonb_build_object('already_viewed', true);
  END IF;
  
  -- Get top 10 winners for the week with their prizes
  WITH weekly_totals AS (
    SELECT 
      wl.user_id,
      SUM(wl.xp_earned) as total_xp
    FROM weekly_xp_log wl
    JOIN school_memberships sm ON sm.user_id = wl.user_id AND sm.school_id = p_school_id
    WHERE wl.earned_at >= v_last_week_start
    AND wl.earned_at < v_last_week_start + INTERVAL '7 days'
    AND wl.school_id = p_school_id
    GROUP BY wl.user_id
    HAVING SUM(wl.xp_earned) > 0
  ),
  ranked AS (
    SELECT 
      wt.user_id,
      wt.total_xp,
      ROW_NUMBER() OVER (ORDER BY wt.total_xp DESC) as position
    FROM weekly_totals wt
  ),
  prizes AS (
    SELECT 
      r.*,
      CASE r.position
        WHEN 1 THEN 800
        WHEN 2 THEN 500
        WHEN 3 THEN 350
        WHEN 4 THEN 100
        WHEN 5 THEN 50
        ELSE 25
      END as prize_xp
    FROM ranked r
    WHERE r.position <= 10
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', p.user_id,
      'name', pr.name,
      'avatar', pr.avatar,
      'equipped_avatar', (pr.preferences->>'equippedAvatar')::jsonb,
      'total_xp', p.total_xp,
      'position', p.position,
      'prize_xp', p.prize_xp
    ) ORDER BY p.position
  )
  INTO v_winners
  FROM prizes p
  JOIN profiles pr ON pr.id = p.user_id;
  
  -- If no winners, return no_data
  IF v_winners IS NULL OR jsonb_array_length(v_winners) = 0 THEN
    RETURN jsonb_build_object('no_data', true);
  END IF;
  
  -- Get current user's position and prize
  SELECT position, prize_xp INTO v_my_position, v_my_prize
  FROM (
    WITH weekly_totals AS (
      SELECT 
        wl.user_id,
        SUM(wl.xp_earned) as total_xp
      FROM weekly_xp_log wl
      JOIN school_memberships sm ON sm.user_id = wl.user_id AND sm.school_id = p_school_id
      WHERE wl.earned_at >= v_last_week_start
      AND wl.earned_at < v_last_week_start + INTERVAL '7 days'
      AND wl.school_id = p_school_id
      GROUP BY wl.user_id
    ),
    ranked AS (
      SELECT 
        wt.user_id,
        ROW_NUMBER() OVER (ORDER BY wt.total_xp DESC) as position
      FROM weekly_totals wt
    ),
    with_prizes AS (
      SELECT 
        r.*,
        CASE r.position
          WHEN 1 THEN 800
          WHEN 2 THEN 500
          WHEN 3 THEN 350
          WHEN 4 THEN 100
          WHEN 5 THEN 50
          WHEN 6 THEN 25
          WHEN 7 THEN 25
          WHEN 8 THEN 25
          WHEN 9 THEN 25
          WHEN 10 THEN 25
          ELSE 0
        END as prize_xp
      FROM ranked r
    )
    SELECT * FROM with_prizes WHERE user_id = p_user_id
  ) my_rank;
  
  RETURN jsonb_build_object(
    'already_viewed', false,
    'week_start', v_last_week_start,
    'winners', v_winners,
    'my_position', COALESCE(v_my_position, 0),
    'my_prize', COALESCE(v_my_prize, 0)
  );
END;
$$;
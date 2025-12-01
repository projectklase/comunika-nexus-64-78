-- Update join_battle_queue to clean up old entries automatically
CREATE OR REPLACE FUNCTION public.join_battle_queue(
  p_user_id uuid,
  p_deck_id uuid,
  p_school_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_queue_entry battle_queue%ROWTYPE;
  v_opponent_entry battle_queue%ROWTYPE;
  v_battle_id UUID;
  v_result JSONB;
BEGIN
  -- Clean up old entries for this user (MATCHED from finished battles or old SEARCHING)
  DELETE FROM battle_queue 
  WHERE user_id = p_user_id
  AND (
    status = 'MATCHED' 
    OR (status = 'SEARCHING' AND created_at < NOW() - INTERVAL '10 minutes')
  );

  -- Check for existing active battle
  IF EXISTS (
    SELECT 1 FROM battles 
    WHERE (player1_id = p_user_id OR player2_id = p_user_id) 
    AND status = 'IN_PROGRESS'
  ) THEN
    RAISE EXCEPTION 'User already in active battle';
  END IF;

  -- Check for existing queue entry
  SELECT * INTO v_queue_entry 
  FROM battle_queue 
  WHERE user_id = p_user_id 
  AND status = 'SEARCHING';

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'SEARCHING',
      'queue_id', v_queue_entry.id
    );
  END IF;

  -- Try to find an opponent in the same school
  SELECT * INTO v_opponent_entry
  FROM battle_queue
  WHERE school_id = p_school_id
    AND status = 'SEARCHING'
    AND user_id != p_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    -- Create battle immediately with turn_started_at initialized
    INSERT INTO battles (
      player1_id,
      player1_deck_id,
      player2_id,
      player2_deck_id,
      status,
      current_turn,
      turn_started_at,
      started_at,
      last_action_at
    ) VALUES (
      v_opponent_entry.user_id,
      v_opponent_entry.deck_id,
      p_user_id,
      p_deck_id,
      'IN_PROGRESS',
      'PLAYER1',
      NOW(),
      NOW(),
      NOW()
    ) RETURNING id INTO v_battle_id;

    -- Update opponent's queue entry
    UPDATE battle_queue
    SET status = 'MATCHED',
        battle_id = v_battle_id,
        matched_with = p_user_id,
        updated_at = NOW()
    WHERE id = v_opponent_entry.id;

    -- Insert current user's queue entry as matched
    INSERT INTO battle_queue (
      user_id,
      deck_id,
      school_id,
      status,
      battle_id,
      matched_with
    ) VALUES (
      p_user_id,
      p_deck_id,
      p_school_id,
      'MATCHED',
      v_battle_id,
      v_opponent_entry.user_id
    );

    v_result := jsonb_build_object(
      'status', 'MATCHED',
      'battle_id', v_battle_id
    );
  ELSE
    -- No opponent found, add to queue
    INSERT INTO battle_queue (
      user_id,
      deck_id,
      school_id,
      status
    ) VALUES (
      p_user_id,
      p_deck_id,
      p_school_id,
      'SEARCHING'
    ) RETURNING id INTO v_queue_entry.id;

    v_result := jsonb_build_object(
      'status', 'SEARCHING',
      'queue_id', v_queue_entry.id
    );
  END IF;

  RETURN v_result;
END;
$function$;
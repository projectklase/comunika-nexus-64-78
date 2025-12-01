-- Fix join_battle_queue to initialize battle properly with IN_PROGRESS status and rounds_data

CREATE OR REPLACE FUNCTION public.join_battle_queue(
  p_user_id UUID,
  p_deck_id UUID,
  p_school_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_queue RECORD;
  v_opponent RECORD;
  v_new_battle_id UUID;
BEGIN
  -- Check if user is already in queue
  SELECT * INTO v_existing_queue
  FROM battle_queue
  WHERE user_id = p_user_id AND status = 'searching';
  
  IF v_existing_queue.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'already_in_queue',
      'queue_id', v_existing_queue.id
    );
  END IF;
  
  -- Look for an available opponent in the same school
  SELECT * INTO v_opponent
  FROM battle_queue
  WHERE school_id = p_school_id
    AND user_id != p_user_id
    AND status = 'searching'
    AND matched_with IS NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If opponent found, create battle immediately with IN_PROGRESS status
  IF v_opponent.id IS NOT NULL THEN
    -- Create new battle with initialized rounds_data
    INSERT INTO battles (
      player1_id,
      player1_deck_id,
      player2_id,
      player2_deck_id,
      status,
      current_turn,
      current_round,
      rounds_data,
      started_at
    ) VALUES (
      v_opponent.user_id,
      v_opponent.deck_id,
      p_user_id,
      p_deck_id,
      'IN_PROGRESS',
      'PLAYER1',
      1,
      '[{"round":1,"player1_cards":{"line1":[],"line2":[],"line3":[]},"player2_cards":{"line1":[],"line2":[],"line3":[]},"player1_score":0,"player2_score":0}]'::jsonb,
      NOW()
    )
    RETURNING id INTO v_new_battle_id;
    
    -- Update both queue entries
    UPDATE battle_queue
    SET 
      status = 'matched',
      matched_with = p_user_id,
      battle_id = v_new_battle_id,
      updated_at = NOW()
    WHERE id = v_opponent.id;
    
    INSERT INTO battle_queue (
      user_id,
      deck_id,
      school_id,
      status,
      matched_with,
      battle_id
    ) VALUES (
      p_user_id,
      p_deck_id,
      p_school_id,
      'matched',
      v_opponent.user_id,
      v_new_battle_id
    );
    
    RETURN jsonb_build_object(
      'status', 'matched',
      'battle_id', v_new_battle_id,
      'opponent_id', v_opponent.user_id
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
      'searching'
    );
    
    RETURN jsonb_build_object(
      'status', 'searching',
      'message', 'Waiting for opponent...'
    );
  END IF;
END;
$$;
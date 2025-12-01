-- Phase 7: Complete Battle System Fixes
-- 1. Delete Aline's old avatar
-- 2. Fix join_battle_queue to initialize turn_started_at
-- 3. Fix check_turn_timeout to use 30 seconds

-- 1. Delete Aline's old base64 avatar (CRITICAL)
UPDATE profiles 
SET avatar = NULL 
WHERE id = 'd28d4f1c-fc41-4c56-8445-c501d0585d58';

-- 2. Fix join_battle_queue to initialize turn_started_at when creating battle
CREATE OR REPLACE FUNCTION join_battle_queue(
  p_user_id UUID,
  p_deck_id UUID,
  p_school_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_queue_entry battle_queue%ROWTYPE;
  v_opponent_entry battle_queue%ROWTYPE;
  v_battle_id UUID;
  v_result JSONB;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update check_turn_timeout to use 30 seconds
CREATE OR REPLACE FUNCTION check_turn_timeout(p_battle_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_battle battles%ROWTYPE;
  v_elapsed_seconds INTEGER;
  v_new_turn TEXT;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND OR v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle not found or not in progress');
  END IF;
  
  IF v_battle.turn_started_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Turn not started');
  END IF;
  
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_battle.turn_started_at))::INTEGER;
  
  IF v_elapsed_seconds >= 30 THEN
    v_new_turn := CASE WHEN v_battle.current_turn = 'PLAYER1' THEN 'PLAYER2' ELSE 'PLAYER1' END;
    
    UPDATE battles SET
      current_turn = v_new_turn,
      turn_started_at = NOW(),
      last_action_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'timeout_occurred', true,
      'new_turn', v_new_turn
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'timeout_occurred', false,
    'elapsed_seconds', v_elapsed_seconds
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
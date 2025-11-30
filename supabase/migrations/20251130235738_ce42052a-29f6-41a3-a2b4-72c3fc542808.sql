-- Fix search_path security warnings for battle queue functions
DROP FUNCTION IF EXISTS join_battle_queue(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS leave_battle_queue(UUID);
DROP FUNCTION IF EXISTS get_queue_position(UUID);

-- RPC: Join battle queue and find match (with secure search_path)
CREATE OR REPLACE FUNCTION join_battle_queue(
  p_user_id UUID,
  p_deck_id UUID,
  p_school_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_opponent_id UUID;
  v_opponent_deck_id UUID;
  v_battle_id UUID;
  v_queue_id UUID;
BEGIN
  -- Check if user already in queue
  DELETE FROM battle_queue WHERE user_id = p_user_id;

  -- Look for available opponent in same school
  SELECT user_id, deck_id INTO v_opponent_id, v_opponent_deck_id
  FROM battle_queue
  WHERE school_id = p_school_id
    AND status = 'SEARCHING'
    AND user_id != p_user_id
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If opponent found, create battle
  IF v_opponent_id IS NOT NULL THEN
    -- Create battle
    INSERT INTO battles (
      player1_id,
      player1_deck_id,
      player2_id,
      player2_deck_id,
      status,
      current_turn
    ) VALUES (
      v_opponent_id,
      v_opponent_deck_id,
      p_user_id,
      p_deck_id,
      'WAITING',
      'PLAYER1'
    ) RETURNING id INTO v_battle_id;

    -- Update opponent's queue entry
    UPDATE battle_queue
    SET status = 'MATCHED',
        matched_with = p_user_id,
        battle_id = v_battle_id,
        updated_at = now()
    WHERE user_id = v_opponent_id;

    -- Insert current user's queue entry as matched
    INSERT INTO battle_queue (user_id, deck_id, school_id, status, matched_with, battle_id)
    VALUES (p_user_id, p_deck_id, p_school_id, 'MATCHED', v_opponent_id, v_battle_id);

    RETURN jsonb_build_object(
      'status', 'MATCHED',
      'battle_id', v_battle_id,
      'opponent_id', v_opponent_id
    );
  ELSE
    -- No opponent found, add to queue
    INSERT INTO battle_queue (user_id, deck_id, school_id, status)
    VALUES (p_user_id, p_deck_id, p_school_id, 'SEARCHING')
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object(
      'status', 'SEARCHING',
      'queue_id', v_queue_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Leave battle queue (with secure search_path)
CREATE OR REPLACE FUNCTION leave_battle_queue(p_user_id UUID) RETURNS VOID AS $$
BEGIN
  DELETE FROM battle_queue WHERE user_id = p_user_id AND status = 'SEARCHING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Get queue position (with secure search_path)
CREATE OR REPLACE FUNCTION get_queue_position(p_user_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_position INTEGER;
  v_school_id UUID;
BEGIN
  SELECT school_id INTO v_school_id FROM battle_queue WHERE user_id = p_user_id;
  
  IF v_school_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) + 1 INTO v_position
  FROM battle_queue
  WHERE school_id = v_school_id
    AND status = 'SEARCHING'
    AND created_at < (SELECT created_at FROM battle_queue WHERE user_id = p_user_id);

  RETURN COALESCE(v_position, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
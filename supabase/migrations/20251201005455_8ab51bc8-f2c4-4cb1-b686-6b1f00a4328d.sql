-- Fix matchmaking for Duelo Direto mechanics
-- Recreate join_battle_queue with UPPERCASE status and correct game_state initialization

CREATE OR REPLACE FUNCTION join_battle_queue(
  p_user_id UUID,
  p_deck_id UUID,
  p_school_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opponent RECORD;
  v_battle_id UUID;
  v_queue_id UUID;
  v_initial_game_state JSONB;
  v_player1_cards UUID[];
  v_player2_cards UUID[];
BEGIN
  -- Remove old queue entry for this user
  DELETE FROM battle_queue WHERE user_id = p_user_id;
  
  -- Search for opponent in same school with UPPERCASE status
  SELECT user_id, deck_id INTO v_opponent
  FROM battle_queue
  WHERE school_id = p_school_id
    AND status = 'SEARCHING'
    AND user_id != p_user_id
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If opponent found, create battle
  IF v_opponent.user_id IS NOT NULL THEN
    -- Get cards from player1 deck (first 5)
    SELECT ARRAY(
      SELECT unnest(card_ids) FROM decks WHERE id = v_opponent.deck_id LIMIT 5
    ) INTO v_player1_cards;
    
    -- Get cards from player2 deck (first 5)
    SELECT ARRAY(
      SELECT unnest(card_ids) FROM decks WHERE id = p_deck_id LIMIT 5
    ) INTO v_player2_cards;
    
    -- Initialize Duelo Direto game state
    v_initial_game_state := jsonb_build_object(
      'player1_hp', 100,
      'player2_hp', 100,
      'player1_field', jsonb_build_object('monster', NULL, 'traps', '[]'::jsonb),
      'player2_field', jsonb_build_object('monster', NULL, 'traps', '[]'::jsonb),
      'player1_hand', to_jsonb(COALESCE(v_player1_cards, ARRAY[]::UUID[])),
      'player2_hand', to_jsonb(COALESCE(v_player2_cards, ARRAY[]::UUID[])),
      'turn_phase', 'MAIN',
      'battle_log', '[]'::jsonb
    );
    
    -- Create battle with IN_PROGRESS status
    INSERT INTO battles (
      player1_id,
      player1_deck_id,
      player2_id,
      player2_deck_id,
      status,
      current_turn,
      game_state,
      started_at
    ) VALUES (
      v_opponent.user_id,
      v_opponent.deck_id,
      p_user_id,
      p_deck_id,
      'IN_PROGRESS',
      'PLAYER1',
      v_initial_game_state,
      NOW()
    ) RETURNING id INTO v_battle_id;
    
    -- Update opponent's queue entry
    UPDATE battle_queue
    SET status = 'MATCHED',
        matched_with = p_user_id,
        battle_id = v_battle_id,
        updated_at = NOW()
    WHERE user_id = v_opponent.user_id;
    
    -- Insert current player's queue entry
    INSERT INTO battle_queue (user_id, deck_id, school_id, status, matched_with, battle_id)
    VALUES (p_user_id, p_deck_id, p_school_id, 'MATCHED', v_opponent.user_id, v_battle_id);
    
    RETURN jsonb_build_object(
      'status', 'MATCHED',
      'battle_id', v_battle_id,
      'opponent_id', v_opponent.user_id
    );
  ELSE
    -- No opponent found, join queue
    INSERT INTO battle_queue (user_id, deck_id, school_id, status)
    VALUES (p_user_id, p_deck_id, p_school_id, 'SEARCHING')
    RETURNING id INTO v_queue_id;
    
    RETURN jsonb_build_object(
      'status', 'SEARCHING',
      'queue_id', v_queue_id
    );
  END IF;
END;
$$;

-- Update leave_battle_queue to use UPPERCASE status
CREATE OR REPLACE FUNCTION leave_battle_queue(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM battle_queue 
  WHERE user_id = p_user_id 
    AND status IN ('SEARCHING', 'WAITING');
END;
$$;

-- Update get_queue_position to use UPPERCASE status
CREATE OR REPLACE FUNCTION get_queue_position(p_user_id UUID, p_school_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_position
  FROM battle_queue
  WHERE school_id = p_school_id
    AND status = 'SEARCHING'
    AND created_at < (
      SELECT created_at FROM battle_queue 
      WHERE user_id = p_user_id AND status = 'SEARCHING'
    );
  
  RETURN COALESCE(v_position, 0);
END;
$$;
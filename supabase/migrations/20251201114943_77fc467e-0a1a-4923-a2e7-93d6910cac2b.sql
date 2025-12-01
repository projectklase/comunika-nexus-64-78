-- Phase 3: Fix card extraction and cleanup broken battles

-- 1. Fix join_battle_queue to correctly extract cards using array slicing
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
    -- Get first 5 cards from player1 deck using array slicing
    SELECT card_ids[1:5] INTO v_player1_cards
    FROM decks WHERE id = v_opponent.deck_id;
    
    -- Get first 5 cards from player2 deck using array slicing
    SELECT card_ids[1:5] INTO v_player2_cards
    FROM decks WHERE id = p_deck_id;
    
    -- Initialize Duelo Direto game state with valid hands
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

-- 2. Cleanup broken battles (empty hands or created over 1 minute ago)
UPDATE battles 
SET status = 'ABANDONED',
    finished_at = NOW()
WHERE status IN ('WAITING', 'IN_PROGRESS')
  AND (
    game_state->'player1_hand' IS NULL 
    OR game_state->'player1_hand' = '[]'::jsonb
    OR game_state->'player2_hand' IS NULL
    OR game_state->'player2_hand' = '[]'::jsonb
    OR jsonb_array_length(game_state->'player1_hand') = 0
    OR jsonb_array_length(game_state->'player2_hand') = 0
  )
  AND created_at < NOW() - INTERVAL '1 minute';
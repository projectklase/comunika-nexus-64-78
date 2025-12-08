CREATE OR REPLACE FUNCTION public.join_battle_queue(
  p_user_id UUID,
  p_deck_id UUID,
  p_school_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing RECORD;
  v_opponent RECORD;
  v_battle_id UUID;
  v_deck_cards UUID[];
  v_opponent_deck_cards UUID[];
  v_p1_hand UUID[];
  v_p2_hand UUID[];
  v_p1_deck UUID[];
  v_p2_deck UUID[];
  v_lock_key BIGINT;
BEGIN
  -- Criar lock key baseado no school_id para serialização
  v_lock_key := ('x' || substr(md5(p_school_id::text), 1, 16))::bit(64)::bigint;
  
  -- Adquirir advisory lock exclusivo para esta escola (serializa matchmaking)
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Limpar entradas antigas do usuário (MATCHED com batalhas finalizadas ou SEARCHING antigo)
  DELETE FROM battle_queue 
  WHERE user_id = p_user_id
    AND (status = 'MATCHED' OR created_at < NOW() - INTERVAL '10 minutes');
  
  -- Check if user already in queue
  SELECT * INTO v_existing
  FROM battle_queue
  WHERE user_id = p_user_id AND status = 'SEARCHING';
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'ALREADY_IN_QUEUE',
      'queue_id', v_existing.id,
      'position', get_queue_position(p_user_id, p_school_id)
    );
  END IF;
  
  -- Check if user already in an active battle
  IF EXISTS (
    SELECT 1 FROM battles 
    WHERE (player1_id = p_user_id OR player2_id = p_user_id)
    AND status IN ('WAITING', 'IN_PROGRESS')
  ) THEN
    RETURN jsonb_build_object(
      'status', 'ALREADY_IN_BATTLE',
      'error', 'Você já está em uma batalha ativa'
    );
  END IF;
  
  -- Look for an opponent in queue from the same school (sem SKIP LOCKED pois temos advisory lock)
  SELECT * INTO v_opponent
  FROM battle_queue
  WHERE school_id = p_school_id
    AND user_id != p_user_id
    AND status = 'SEARCHING'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;
  
  IF FOUND THEN
    -- Create battle
    v_battle_id := gen_random_uuid();
    
    -- Get deck cards for both players
    SELECT card_ids INTO v_deck_cards FROM decks WHERE id = p_deck_id;
    SELECT card_ids INTO v_opponent_deck_cards FROM decks WHERE id = v_opponent.deck_id;
    
    -- Shuffle and draw hands (5 cards each)
    v_deck_cards := ARRAY(SELECT unnest(v_deck_cards) ORDER BY random());
    v_opponent_deck_cards := ARRAY(SELECT unnest(v_opponent_deck_cards) ORDER BY random());
    
    v_p1_hand := v_opponent_deck_cards[1:5];
    v_p1_deck := v_opponent_deck_cards[6:array_length(v_opponent_deck_cards, 1)];
    v_p2_hand := v_deck_cards[1:5];
    v_p2_deck := v_deck_cards[6:array_length(v_deck_cards, 1)];
    
    -- Create the battle
    INSERT INTO battles (
      id,
      player1_id,
      player2_id,
      player1_deck_id,
      player2_deck_id,
      status,
      current_turn,
      turn_started_at,
      game_state
    ) VALUES (
      v_battle_id,
      v_opponent.user_id,
      p_user_id,
      v_opponent.deck_id,
      p_deck_id,
      'IN_PROGRESS',
      'PLAYER1',
      NOW(),
      jsonb_build_object(
        'player1_hp', 100,
        'player2_hp', 100,
        'player1_hand', v_p1_hand,
        'player2_hand', v_p2_hand,
        'player1_deck', v_p1_deck,
        'player2_deck', v_p2_deck,
        'player1_field', jsonb_build_object('monster', null, 'traps', '[]'::jsonb),
        'player2_field', jsonb_build_object('monster', null, 'traps', '[]'::jsonb),
        'battle_log', '[]'::jsonb,
        'is_setup_phase', true,
        'turn_number', 1
      )
    );
    
    -- Update opponent's queue entry
    UPDATE battle_queue
    SET status = 'MATCHED',
        matched_with = p_user_id,
        battle_id = v_battle_id,
        updated_at = NOW()
    WHERE id = v_opponent.id;
    
    -- Return match found
    RETURN jsonb_build_object(
      'status', 'MATCHED',
      'battle_id', v_battle_id,
      'opponent_id', v_opponent.user_id
    );
  ELSE
    -- No opponent found, add to queue
    INSERT INTO battle_queue (user_id, deck_id, school_id, status)
    VALUES (p_user_id, p_deck_id, p_school_id, 'SEARCHING');
    
    RETURN jsonb_build_object(
      'status', 'SEARCHING',
      'position', get_queue_position(p_user_id, p_school_id)
    );
  END IF;
END;
$$;
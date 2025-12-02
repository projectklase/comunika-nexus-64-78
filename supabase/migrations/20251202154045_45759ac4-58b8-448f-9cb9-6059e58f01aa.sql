-- Fix matchmaking race condition by using blocking advisory lock
-- Previously used pg_try_advisory_xact_lock (non-blocking) which allowed
-- concurrent transactions to both search and insert, missing each other

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
  v_opponent_id UUID;
  v_opponent_deck_id UUID;
  v_opponent_queue_id UUID;
  v_battle_id UUID;
  v_queue_id UUID;
BEGIN
  -- Use BLOCKING advisory lock to serialize matchmaking per school
  -- This ensures only one player at a time can search for opponents
  -- Second player waits until first commits, then sees their entry
  PERFORM pg_advisory_xact_lock(hashtext(p_school_id::text));
  
  -- Delete old entries for this user
  DELETE FROM battle_queue 
  WHERE user_id = p_user_id
  AND (status = 'MATCHED' OR (status = 'SEARCHING' AND created_at < NOW() - INTERVAL '10 minutes'));

  -- Check if user already has an active battle
  IF EXISTS (
    SELECT 1 FROM battles 
    WHERE (player1_id = p_user_id OR player2_id = p_user_id)
    AND status = 'IN_PROGRESS'
  ) THEN
    RAISE EXCEPTION 'User already in active battle';
  END IF;

  -- Try to find an opponent in the same school
  SELECT id, user_id, deck_id INTO v_opponent_queue_id, v_opponent_id, v_opponent_deck_id
  FROM battle_queue
  WHERE school_id = p_school_id
    AND user_id != p_user_id
    AND status = 'SEARCHING'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_opponent_id IS NOT NULL THEN
    -- Create battle with turn_started_at set
    INSERT INTO battles (
      player1_id, player1_deck_id, player2_id, player2_deck_id,
      status, current_turn, started_at, turn_started_at
    ) VALUES (
      v_opponent_id, v_opponent_deck_id, p_user_id, p_deck_id,
      'IN_PROGRESS', 'PLAYER1', NOW(), NOW()
    ) RETURNING id INTO v_battle_id;

    -- Initialize game_state with hands
    UPDATE battles
    SET game_state = jsonb_build_object(
      'player1_hp', 100,
      'player2_hp', 100,
      'player1_hand', (
        SELECT jsonb_agg(jsonb_build_object('id', card_id))
        FROM (
          SELECT unnest(card_ids[1:5]) as card_id
          FROM decks WHERE id = v_opponent_deck_id
        ) sub
      ),
      'player2_hand', (
        SELECT jsonb_agg(jsonb_build_object('id', card_id))
        FROM (
          SELECT unnest(card_ids[1:5]) as card_id
          FROM decks WHERE id = p_deck_id
        ) sub
      ),
      'player1_field', jsonb_build_object('monster', null, 'traps', '[]'::jsonb),
      'player2_field', jsonb_build_object('monster', null, 'traps', '[]'::jsonb),
      'turn_phase', 'DRAW',
      'battle_log', '[]'::jsonb
    )
    WHERE id = v_battle_id;

    -- Update queue entries
    UPDATE battle_queue
    SET status = 'MATCHED', battle_id = v_battle_id, matched_with = p_user_id, updated_at = NOW()
    WHERE id = v_opponent_queue_id;

    INSERT INTO battle_queue (user_id, deck_id, school_id, status, battle_id, matched_with)
    VALUES (p_user_id, p_deck_id, p_school_id, 'MATCHED', v_battle_id, v_opponent_id)
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object('status', 'MATCHED', 'battle_id', v_battle_id, 'queue_id', v_queue_id);
  ELSE
    -- No opponent found, add to queue
    INSERT INTO battle_queue (user_id, deck_id, school_id, status)
    VALUES (p_user_id, p_deck_id, p_school_id, 'SEARCHING')
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object('status', 'SEARCHING', 'queue_id', v_queue_id);
  END IF;
END;
$$;
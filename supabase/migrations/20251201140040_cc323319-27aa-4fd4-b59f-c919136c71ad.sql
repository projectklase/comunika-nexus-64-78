-- Fix join_battle_queue to use 'PLAYER1' string instead of UUID for current_turn
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
  -- Delete old entries for this user (MATCHED from finished battles or old SEARCHING)
  DELETE FROM battle_queue 
  WHERE user_id = p_user_id
  AND (
    status = 'MATCHED' 
    OR (status = 'SEARCHING' AND created_at < NOW() - INTERVAL '10 minutes')
  );

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
  FOR UPDATE SKIP LOCKED;

  IF v_opponent_id IS NOT NULL THEN
    -- Create battle with PLAYER1 as current_turn (string, not UUID)
    INSERT INTO battles (
      player1_id,
      player1_deck_id,
      player2_id,
      player2_deck_id,
      status,
      current_turn,
      started_at
    ) VALUES (
      v_opponent_id,
      v_opponent_deck_id,
      p_user_id,
      p_deck_id,
      'IN_PROGRESS',
      'PLAYER1',
      NOW()
    ) RETURNING id INTO v_battle_id;

    -- Initialize game_state with 5-card hands for both players
    UPDATE battles
    SET game_state = jsonb_build_object(
      'player1_hp', 100,
      'player2_hp', 100,
      'player1_hand', (
        SELECT jsonb_agg(card_id ORDER BY random())
        FROM (
          SELECT unnest(card_ids[1:5]) as card_id
          FROM decks
          WHERE id = v_opponent_deck_id
        ) sub
      ),
      'player2_hand', (
        SELECT jsonb_agg(card_id ORDER BY random())
        FROM (
          SELECT unnest(card_ids[1:5]) as card_id
          FROM decks
          WHERE id = p_deck_id
        ) sub
      ),
      'player1_field', jsonb_build_object('monster', null, 'traps', '[]'::jsonb),
      'player2_field', jsonb_build_object('monster', null, 'traps', '[]'::jsonb),
      'turn_phase', 'DRAW',
      'battle_log', '[]'::jsonb
    )
    WHERE id = v_battle_id;

    -- Update both queue entries
    UPDATE battle_queue
    SET status = 'MATCHED', battle_id = v_battle_id, matched_with = p_user_id, updated_at = NOW()
    WHERE id = v_opponent_queue_id;

    INSERT INTO battle_queue (user_id, deck_id, school_id, status, battle_id, matched_with)
    VALUES (p_user_id, p_deck_id, p_school_id, 'MATCHED', v_battle_id, v_opponent_id)
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object(
      'status', 'MATCHED',
      'battle_id', v_battle_id,
      'queue_id', v_queue_id
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
$$;
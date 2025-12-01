-- Phase 13: Fix play_card to handle both UUID array and object array formats
-- Also update existing battles with NULL turn_started_at

-- First, drop the existing play_card function with p_position parameter
DROP FUNCTION IF EXISTS play_card(uuid, uuid, uuid, text);

-- Recreate with intelligent format detection
CREATE OR REPLACE FUNCTION play_card(
  p_battle_id UUID,
  p_card_id UUID,
  p_player_id UUID,
  p_position text DEFAULT 'ATTACK'
) RETURNS jsonb AS $$
DECLARE
  v_battle battles%ROWTYPE;
  v_game_state jsonb;
  v_player_key text;
  v_hand_cards jsonb;
  v_card_index integer;
  v_card_data jsonb;
  v_field_key text;
  v_log_entry jsonb;
BEGIN
  -- Get battle
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;

  IF v_battle.status != 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Battle is not in progress';
  END IF;

  -- Determine player
  IF v_battle.player1_id = p_player_id THEN
    v_player_key := 'player1';
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_key := 'player2';
  ELSE
    RAISE EXCEPTION 'Player not in this battle';
  END IF;

  -- Check turn
  IF v_battle.current_turn != v_player_key THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_game_state := v_battle.game_state;
  v_hand_cards := v_game_state->(v_player_key || '_hand');

  -- Intelligent format detection: find card in hand
  v_card_index := -1;
  FOR i IN 0..jsonb_array_length(v_hand_cards)-1 LOOP
    -- Check if element is a string UUID or an object with id
    IF jsonb_typeof(v_hand_cards->i) = 'string' THEN
      -- Format: array of string UUIDs ["uuid1", "uuid2"]
      IF (v_hand_cards->>i)::UUID = p_card_id THEN
        v_card_index := i;
        EXIT;
      END IF;
    ELSE
      -- Format: array of objects [{"id": "uuid1"}, {"id": "uuid2"}]
      IF (v_hand_cards->i->>'id')::UUID = p_card_id THEN
        v_card_index := i;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  IF v_card_index = -1 THEN
    RAISE EXCEPTION 'Card not in hand';
  END IF;

  -- Get full card data from cards table
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'atk', c.atk,
    'def', c.def,
    'effects', c.effects,
    'rarity', c.rarity,
    'image_url', c.image_url,
    'position', p_position
  ) INTO v_card_data
  FROM cards c
  WHERE c.id = p_card_id;

  IF v_card_data IS NULL THEN
    RAISE EXCEPTION 'Card data not found';
  END IF;

  -- Remove card from hand
  v_game_state := jsonb_set(
    v_game_state,
    ARRAY[v_player_key || '_hand'],
    (v_hand_cards - v_card_index)
  );

  -- Place card on field
  v_field_key := v_player_key || '_field';
  v_game_state := jsonb_set(
    v_game_state,
    ARRAY[v_field_key, 'monster'],
    v_card_data
  );

  -- Add to battle log
  v_log_entry := jsonb_build_object(
    'action', 'PLAY_MONSTER',
    'player', v_player_key,
    'card_id', p_card_id,
    'card_name', v_card_data->>'name',
    'position', p_position,
    'timestamp', NOW()
  );

  v_game_state := jsonb_set(
    v_game_state,
    '{battle_log}',
    (v_game_state->'battle_log') || v_log_entry
  );

  -- Update battle
  UPDATE battles
  SET 
    game_state = v_game_state,
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;

  RETURN jsonb_build_object(
    'success', true,
    'game_state', v_game_state
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing battles with NULL turn_started_at
UPDATE battles 
SET turn_started_at = NOW() 
WHERE turn_started_at IS NULL 
  AND status = 'IN_PROGRESS';
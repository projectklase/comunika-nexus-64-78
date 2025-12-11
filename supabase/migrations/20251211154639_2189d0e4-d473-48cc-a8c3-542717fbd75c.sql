
-- Fix play_card function to remove only ONE occurrence of a card_id
-- instead of all occurrences (JSONB - operator removes ALL matches)

CREATE OR REPLACE FUNCTION public.play_card(
  p_battle_id UUID,
  p_player_id UUID,
  p_card_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_player_key TEXT;
  v_opponent_key TEXT;
  v_hand_cards JSONB;
  v_field JSONB;
  v_card RECORD;
  v_card_in_hand BOOLEAN := FALSE;
  v_new_hand JSONB;
BEGIN
  -- Get battle
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'ONGOING' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em andamento');
  END IF;
  
  -- Determine player keys
  IF v_battle.player1_id = p_player_id THEN
    v_player_key := 'player1';
    v_opponent_key := 'player2';
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_key := 'player2';
    v_opponent_key := 'player1';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Você não faz parte desta batalha');
  END IF;
  
  -- Check if it's player's turn
  IF v_battle.current_turn != UPPER(v_player_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
  END IF;
  
  v_game_state := v_battle.game_state;
  v_hand_cards := v_game_state->>(v_player_key || '_hand');
  v_field := v_game_state->(v_player_key || '_field');
  
  -- Parse hand if it's a string
  IF jsonb_typeof(v_hand_cards) = 'string' THEN
    v_hand_cards := v_hand_cards::JSONB;
  END IF;
  
  -- Check if card is in hand (at least one occurrence)
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(v_hand_cards) elem
    WHERE elem = p_card_id::TEXT
  ) INTO v_card_in_hand;
  
  IF NOT v_card_in_hand THEN
    RETURN jsonb_build_object('success', false, 'error', 'Carta não está na sua mão');
  END IF;
  
  -- Get card details
  SELECT * INTO v_card FROM cards WHERE id = p_card_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Carta não encontrada');
  END IF;
  
  -- Check if field already has a monster
  IF v_field->>'monster' IS NOT NULL AND v_field->>'monster' != 'null' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já tem um monstro em campo');
  END IF;
  
  -- Remove only ONE occurrence of the card from hand
  -- This fixes the bug where all duplicates were being removed
  WITH numbered_cards AS (
    SELECT 
      elem::TEXT as card_id,
      row_number() OVER () as rn
    FROM jsonb_array_elements(v_hand_cards) elem
  ),
  first_match AS (
    SELECT MIN(rn) as first_rn 
    FROM numbered_cards 
    WHERE card_id = '"' || p_card_id::TEXT || '"'
  )
  SELECT COALESCE(
    jsonb_agg(numbered_cards.card_id::JSONB ORDER BY numbered_cards.rn),
    '[]'::JSONB
  )
  INTO v_new_hand
  FROM numbered_cards, first_match
  WHERE numbered_cards.rn != COALESCE(first_match.first_rn, -1);
  
  -- Create card in play object
  v_field := jsonb_set(
    v_field,
    '{monster}',
    jsonb_build_object(
      'card_id', p_card_id,
      'name', v_card.name,
      'atk', v_card.atk,
      'current_hp', v_card.def,
      'max_hp', v_card.def,
      'effects', COALESCE(v_card.effects, '[]'::JSONB),
      'can_attack', false,
      'summoned_this_turn', true
    )
  );
  
  -- Update game state
  v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hand'], v_new_hand);
  v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_field'], v_field);
  
  -- Add to battle log
  v_game_state := jsonb_set(
    v_game_state,
    '{battle_log}',
    COALESCE(v_game_state->'battle_log', '[]'::JSONB) || jsonb_build_array(
      jsonb_build_object(
        'type', 'SUMMON',
        'player', v_player_key,
        'card_name', v_card.name,
        'timestamp', NOW()
      )
    )
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
    'game_state', v_game_state,
    'message', v_card.name || ' foi invocado!'
  );
END;
$$;

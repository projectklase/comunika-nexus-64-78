-- Restaurar função play_card que funciona com array de UUIDs diretos
-- A versão defeituosa em 20251215125752 quebrou a busca na mão

DROP FUNCTION IF EXISTS public.play_card(uuid, uuid, uuid, boolean);

CREATE OR REPLACE FUNCTION public.play_card(p_battle_id uuid, p_player_id uuid, p_card_id uuid, p_is_trap boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_player_field TEXT;
  v_player_hand TEXT;
  v_player_turn TEXT;
  v_card RECORD;
  v_hand_cards JSONB;
  v_current_turn_number INT;
  v_current_traps JSONB;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batalha não encontrada';
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Batalha não está em andamento';
  END IF;
  
  IF v_battle.player1_id = p_player_id THEN
    v_player_field := 'player1_field';
    v_player_hand := 'player1_hand';
    v_player_turn := 'PLAYER1';
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_field := 'player2_field';
    v_player_hand := 'player2_hand';
    v_player_turn := 'PLAYER2';
  ELSE
    RAISE EXCEPTION 'Você não está nesta batalha';
  END IF;
  
  IF v_battle.current_turn != v_player_turn THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;
  
  v_game_state := v_battle.game_state;
  
  -- Get or initialize turn number
  v_current_turn_number := COALESCE((v_game_state->>'turn_number')::INT, 1);
  
  -- FETCH CARD DATA from cards table
  SELECT id, name, atk, def, effects, image_url, rarity, card_type
  INTO v_card 
  FROM cards 
  WHERE id = p_card_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carta não encontrada';
  END IF;
  
  v_hand_cards := v_game_state->v_player_hand;
  
  -- HYBRID SEARCH: Works with both UUID arrays ["uuid1", "uuid2"] and object arrays [{id: "uuid1"}, ...]
  IF NOT (
    v_hand_cards ? p_card_id::TEXT OR
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_hand_cards) elem 
      WHERE elem->>'id' = p_card_id::TEXT
    )
  ) THEN
    RAISE EXCEPTION 'Carta não está na sua mão';
  END IF;
  
  -- Remove card from hand (hybrid removal)
  IF v_hand_cards ? p_card_id::TEXT THEN
    v_hand_cards := v_hand_cards - p_card_id::TEXT;
  ELSE
    v_hand_cards := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(v_hand_cards) elem
      WHERE elem->>'id' != p_card_id::TEXT
    );
  END IF;
  v_game_state := jsonb_set(v_game_state, ARRAY[v_player_hand], v_hand_cards);
  
  IF p_is_trap OR v_card.card_type = 'TRAP' THEN
    -- CHECK: Limit 1 trap per player
    v_current_traps := COALESCE(v_game_state->v_player_field->'traps', '[]'::jsonb);
    IF jsonb_array_length(v_current_traps) >= 1 THEN
      RAISE EXCEPTION 'Você já tem uma trap no campo. Só é permitida 1 trap por vez.';
    END IF;
    
    v_game_state := jsonb_set(
      v_game_state,
      ARRAY[v_player_field, 'traps'],
      v_current_traps || 
      jsonb_build_object(
        'id', v_card.id,
        'name', v_card.name,
        'effects', v_card.effects,
        'image_url', v_card.image_url,
        'rarity', v_card.rarity
      )
    );
  ELSE
    IF v_game_state->v_player_field->>'monster' IS NOT NULL AND v_game_state->v_player_field->'monster' != 'null'::jsonb THEN
      RAISE EXCEPTION 'Você já tem um monstro no campo';
    END IF;
    
    -- Hearthstone system: DEF becomes initial HP
    -- SUMMONING SICKNESS: track turn when played
    v_game_state := jsonb_set(
      v_game_state,
      ARRAY[v_player_field, 'monster'],
      jsonb_build_object(
        'id', v_card.id,
        'name', v_card.name,
        'atk', v_card.atk,
        'def', v_card.def,
        'current_hp', v_card.def,
        'max_hp', v_card.def,
        'effects', v_card.effects,
        'image_url', v_card.image_url,
        'rarity', v_card.rarity,
        'summoned_on_turn', v_current_turn_number
      )
    );
  END IF;
  
  v_game_state := jsonb_set(
    v_game_state,
    '{battle_log}',
    COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
    jsonb_build_object(
      'action', CASE WHEN p_is_trap OR v_card.card_type = 'TRAP' THEN 'PLAY_TRAP' ELSE 'PLAY_MONSTER' END,
      'player', v_player_turn,
      'card_name', v_card.name,
      'timestamp', NOW()
    )
  );
  
  UPDATE battles 
  SET game_state = v_game_state,
      last_action_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object('success', true, 'game_state', v_game_state, 'summoning_sickness', NOT (p_is_trap OR v_card.card_type = 'TRAP'));
END;
$function$;
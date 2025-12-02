
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
  v_player_turn TEXT;  -- NEW: uppercase for turn comparison
  v_card RECORD;
  v_hand_cards JSONB;
BEGIN
  -- Buscar batalha
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batalha não encontrada';
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Batalha não está em andamento';
  END IF;
  
  -- Determinar qual jogador (lowercase para game_state, uppercase para current_turn)
  IF v_battle.player1_id = p_player_id THEN
    v_player_field := 'player1_field';
    v_player_hand := 'player1_hand';
    v_player_turn := 'PLAYER1';  -- uppercase for comparison
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_field := 'player2_field';
    v_player_hand := 'player2_hand';
    v_player_turn := 'PLAYER2';  -- uppercase for comparison
  ELSE
    RAISE EXCEPTION 'Você não está nesta batalha';
  END IF;
  
  -- Verificar turno com case correto
  IF v_battle.current_turn != v_player_turn THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;
  
  v_game_state := v_battle.game_state;
  
  -- Buscar dados da carta incluindo image_url e rarity
  SELECT id, name, atk, def, effects, image_url, rarity 
  INTO v_card 
  FROM cards 
  WHERE id = p_card_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carta não encontrada';
  END IF;
  
  -- Verificar se carta está na mão (suporta ambos formatos: string ou {id: uuid})
  v_hand_cards := v_game_state->v_player_hand;
  
  -- Check if card is in hand (handle both formats)
  IF NOT (
    v_hand_cards ? p_card_id::TEXT OR
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_hand_cards) elem 
      WHERE elem->>'id' = p_card_id::TEXT
    )
  ) THEN
    RAISE EXCEPTION 'Carta não está na sua mão';
  END IF;
  
  -- Remover carta da mão (handle both formats)
  IF v_hand_cards ? p_card_id::TEXT THEN
    -- String format: remove directly
    v_hand_cards := v_hand_cards - p_card_id::TEXT;
  ELSE
    -- Object format: filter out the matching id
    v_hand_cards := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(v_hand_cards) elem
      WHERE elem->>'id' != p_card_id::TEXT
    );
  END IF;
  v_game_state := jsonb_set(v_game_state, ARRAY[v_player_hand], v_hand_cards);
  
  -- Colocar carta no campo
  IF p_is_trap THEN
    -- Adicionar à zona de armadilhas (array)
    v_game_state := jsonb_set(
      v_game_state,
      ARRAY[v_player_field, 'traps'],
      COALESCE(v_game_state->v_player_field->'traps', '[]'::jsonb) || 
      jsonb_build_object(
        'id', v_card.id,
        'name', v_card.name,
        'effects', v_card.effects,
        'image_url', v_card.image_url,
        'rarity', v_card.rarity
      )
    );
  ELSE
    -- Colocar como monstro (apenas 1 permitido)
    IF v_game_state->v_player_field->>'monster' IS NOT NULL THEN
      RAISE EXCEPTION 'Você já tem um monstro no campo';
    END IF;
    
    v_game_state := jsonb_set(
      v_game_state,
      ARRAY[v_player_field, 'monster'],
      jsonb_build_object(
        'id', v_card.id,
        'name', v_card.name,
        'atk', v_card.atk,
        'def', v_card.def,
        'effects', v_card.effects,
        'image_url', v_card.image_url,
        'rarity', v_card.rarity
      )
    );
  END IF;
  
  -- Adicionar ao log
  v_game_state := jsonb_set(
    v_game_state,
    '{battle_log}',
    COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
    jsonb_build_object(
      'action', CASE WHEN p_is_trap THEN 'PLAY_TRAP' ELSE 'PLAY_MONSTER' END,
      'player', v_player_turn,
      'card_name', v_card.name,
      'timestamp', NOW()
    )
  );
  
  -- Atualizar batalha
  UPDATE battles 
  SET game_state = v_game_state,
      last_action_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object('success', true, 'game_state', v_game_state);
END;
$function$;

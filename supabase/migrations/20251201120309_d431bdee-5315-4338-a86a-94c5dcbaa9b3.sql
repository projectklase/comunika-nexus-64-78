-- ============================================
-- FASE 3: CORREÇÕES CRÍTICAS DE BATALHA
-- ============================================

-- 1. Corrigir função play_card para incluir image_url e rarity
CREATE OR REPLACE FUNCTION public.play_card(
  p_battle_id UUID,
  p_player_id UUID,
  p_card_id UUID,
  p_is_trap BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_player_field TEXT;
  v_player_hand TEXT;
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
  
  -- Determinar qual jogador
  IF v_battle.player1_id = p_player_id THEN
    v_player_field := 'player1_field';
    v_player_hand := 'player1_hand';
    
    IF v_battle.current_turn != 'PLAYER1' THEN
      RAISE EXCEPTION 'Não é seu turno';
    END IF;
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_field := 'player2_field';
    v_player_hand := 'player2_hand';
    
    IF v_battle.current_turn != 'PLAYER2' THEN
      RAISE EXCEPTION 'Não é seu turno';
    END IF;
  ELSE
    RAISE EXCEPTION 'Você não está nesta batalha';
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
  
  -- Verificar se carta está na mão
  v_hand_cards := v_game_state->v_player_hand;
  
  IF NOT (v_hand_cards ? p_card_id::TEXT) THEN
    RAISE EXCEPTION 'Carta não está na sua mão';
  END IF;
  
  -- Remover carta da mão
  v_hand_cards := v_hand_cards - p_card_id::TEXT;
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
      'player', CASE WHEN v_battle.player1_id = p_player_id THEN 'PLAYER1' ELSE 'PLAYER2' END,
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
$$;

-- 2. Limpar batalhas quebradas (game_state NULL ou hands inválidas)
UPDATE battles 
SET status = 'ABANDONED',
    finished_at = NOW()
WHERE status IN ('WAITING', 'IN_PROGRESS')
  AND (
    game_state IS NULL 
    OR game_state->'player1_hand' IS NULL
    OR game_state->'player2_hand' IS NULL
    OR game_state->'player1_hand' = 'null'::jsonb
    OR game_state->'player2_hand' = 'null'::jsonb
    OR jsonb_array_length(COALESCE(game_state->'player1_hand', '[]'::jsonb)) = 0
    OR jsonb_array_length(COALESCE(game_state->'player2_hand', '[]'::jsonb)) = 0
  );

-- 3. Atualizar join_battle_queue para impedir múltiplas batalhas ativas
CREATE OR REPLACE FUNCTION public.join_battle_queue(
  p_user_id UUID,
  p_deck_id UUID,
  p_school_id UUID
)
RETURNS JSONB
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
  -- NOVO: Verificar se usuário já tem batalha ativa
  IF EXISTS (
    SELECT 1 FROM battles 
    WHERE (player1_id = p_user_id OR player2_id = p_user_id)
      AND status = 'IN_PROGRESS'
  ) THEN
    RAISE EXCEPTION 'Você já tem uma batalha em andamento! Termine ou abandone a batalha atual antes de iniciar uma nova.';
  END IF;

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
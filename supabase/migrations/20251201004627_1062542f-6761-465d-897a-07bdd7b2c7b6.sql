-- =====================================================
-- MIGRATION: Direct Duel Card Game System
-- Simplifies Gwent-style to Yu-Gi-Oh!/Pokémon-like mechanic
-- =====================================================

-- 1. Add card_type enum for MONSTER, TRAP, SPELL cards
CREATE TYPE card_type AS ENUM ('MONSTER', 'TRAP', 'SPELL');

-- 2. Add card_type column to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_type card_type DEFAULT 'MONSTER';

-- 3. Update existing cards to be MONSTER type
UPDATE cards SET card_type = 'MONSTER' WHERE card_type IS NULL;

-- 4. Modify battles table structure for Direct Duel
ALTER TABLE battles 
  DROP COLUMN IF EXISTS rounds_data,
  ADD COLUMN IF NOT EXISTS game_state JSONB DEFAULT '{
    "player1_hp": 100,
    "player2_hp": 100,
    "player1_field": {"monster": null, "traps": []},
    "player2_field": {"monster": null, "traps": []},
    "player1_hand": [],
    "player2_hand": [],
    "turn_phase": "DRAW",
    "battle_log": []
  }'::jsonb;

-- Remove old round tracking columns
ALTER TABLE battles 
  DROP COLUMN IF EXISTS player1_rounds_won,
  DROP COLUMN IF EXISTS player2_rounds_won,
  DROP COLUMN IF EXISTS current_round;

-- 5. Fix status case consistency (UPPERCASE)
UPDATE battle_queue SET status = 'SEARCHING' WHERE status = 'searching';
UPDATE battle_queue SET status = 'MATCHED' WHERE status = 'matched';
UPDATE battles SET status = 'WAITING' WHERE status = 'waiting';
UPDATE battles SET status = 'IN_PROGRESS' WHERE status = 'in_progress';
UPDATE battles SET status = 'FINISHED' WHERE status = 'finished';

-- 6. Drop old play_battle_turn and finish_battle_round functions
DROP FUNCTION IF EXISTS play_battle_turn(UUID, UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS finish_battle_round(UUID);

-- 7. Create new play_card RPC for Direct Duel
CREATE OR REPLACE FUNCTION play_card(
  p_battle_id UUID,
  p_player_id UUID,
  p_card_id UUID,
  p_is_trap BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle RECORD;
  v_card RECORD;
  v_current_player TEXT;
  v_game_state JSONB;
  v_player_field TEXT;
  v_hand_key TEXT;
BEGIN
  -- Lock battle row
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id FOR UPDATE;
  
  IF v_battle IS NULL THEN 
    RAISE EXCEPTION 'Batalha não encontrada'; 
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN 
    RAISE EXCEPTION 'Batalha não está em progresso'; 
  END IF;
  
  -- Determine current player
  IF p_player_id = v_battle.player1_id THEN 
    v_current_player := 'player1';
  ELSIF p_player_id = v_battle.player2_id THEN 
    v_current_player := 'player2';
  ELSE 
    RAISE EXCEPTION 'Jogador não participa desta batalha'; 
  END IF;
  
  -- Check if it's player's turn
  IF v_battle.current_turn != UPPER(v_current_player) THEN 
    RAISE EXCEPTION 'Não é seu turno'; 
  END IF;
  
  -- Get card data
  SELECT c.* INTO v_card 
  FROM cards c 
  INNER JOIN user_cards uc ON uc.card_id = c.id 
  WHERE c.id = p_card_id AND uc.user_id = p_player_id;
  
  IF v_card IS NULL THEN 
    RAISE EXCEPTION 'Carta não encontrada'; 
  END IF;
  
  v_game_state := v_battle.game_state;
  v_player_field := v_current_player || '_field';
  v_hand_key := v_current_player || '_hand';
  
  -- Remove card from hand
  v_game_state := jsonb_set(
    v_game_state,
    ARRAY[v_hand_key],
    (v_game_state->v_hand_key) - p_card_id::text
  );
  
  -- Place card on field
  IF p_is_trap OR v_card.card_type = 'TRAP' THEN
    -- Add to traps array
    v_game_state := jsonb_set(
      v_game_state,
      ARRAY[v_player_field, 'traps'],
      (v_game_state->v_player_field->'traps') || jsonb_build_object(
        'id', v_card.id,
        'name', v_card.name,
        'effects', v_card.effects,
        'is_facedown', true
      )
    );
  ELSE
    -- Place as monster
    v_game_state := jsonb_set(
      v_game_state,
      ARRAY[v_player_field, 'monster'],
      jsonb_build_object(
        'id', v_card.id,
        'name', v_card.name,
        'atk', v_card.atk,
        'def', v_card.def,
        'effects', v_card.effects
      )
    );
  END IF;
  
  -- Add to battle log
  v_game_state := jsonb_set(
    v_game_state,
    ARRAY['battle_log'],
    (v_game_state->'battle_log') || jsonb_build_array(
      jsonb_build_object(
        'action', CASE WHEN p_is_trap THEN 'PLAY_TRAP' ELSE 'PLAY_MONSTER' END,
        'player', v_current_player,
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
    'game_state', v_game_state
  );
END;
$$;

-- 8. Create attack RPC
CREATE OR REPLACE FUNCTION attack(
  p_battle_id UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle RECORD;
  v_current_player TEXT;
  v_opponent_player TEXT;
  v_game_state JSONB;
  v_attacker JSONB;
  v_defender JSONB;
  v_damage INTEGER;
  v_opponent_hp INTEGER;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id FOR UPDATE;
  
  IF p_player_id = v_battle.player1_id THEN 
    v_current_player := 'player1';
    v_opponent_player := 'player2';
  ELSE 
    v_current_player := 'player2';
    v_opponent_player := 'player1';
  END IF;
  
  v_game_state := v_battle.game_state;
  
  -- Get attacker monster
  v_attacker := v_game_state->(v_current_player || '_field')->'monster';
  IF v_attacker IS NULL THEN
    RAISE EXCEPTION 'Você não tem monstro em campo para atacar';
  END IF;
  
  -- Get defender monster
  v_defender := v_game_state->(v_opponent_player || '_field')->'monster';
  
  -- Calculate damage
  IF v_defender IS NOT NULL THEN
    -- Monster vs Monster
    v_damage := (v_attacker->>'atk')::int - (v_defender->>'def')::int;
    IF v_damage < 0 THEN v_damage := 0; END IF;
  ELSE
    -- Direct attack
    v_damage := (v_attacker->>'atk')::int;
  END IF;
  
  -- Apply damage to opponent HP
  v_opponent_hp := (v_game_state->(v_opponent_player || '_hp'))::int - v_damage;
  IF v_opponent_hp < 0 THEN v_opponent_hp := 0; END IF;
  
  v_game_state := jsonb_set(
    v_game_state,
    ARRAY[v_opponent_player || '_hp'],
    to_jsonb(v_opponent_hp)
  );
  
  -- Add to battle log
  v_game_state := jsonb_set(
    v_game_state,
    ARRAY['battle_log'],
    (v_game_state->'battle_log') || jsonb_build_array(
      jsonb_build_object(
        'action', 'ATTACK',
        'player', v_current_player,
        'damage', v_damage,
        'target_hp', v_opponent_hp,
        'timestamp', NOW()
      )
    )
  );
  
  -- Check win condition
  IF v_opponent_hp <= 0 THEN
    UPDATE battles 
    SET 
      status = 'FINISHED',
      winner_id = p_player_id,
      finished_at = NOW(),
      game_state = v_game_state
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'battle_finished', true,
      'winner', v_current_player,
      'game_state', v_game_state
    );
  END IF;
  
  -- Switch turn
  UPDATE battles 
  SET 
    game_state = v_game_state,
    current_turn = CASE 
      WHEN current_turn = 'PLAYER1' THEN 'PLAYER2' 
      ELSE 'PLAYER1' 
    END,
    last_action_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'battle_finished', false,
    'game_state', v_game_state
  );
END;
$$;

-- 9. Insert seed data for Trap Cards
INSERT INTO cards (name, category, rarity, card_type, atk, def, effects, description, is_active, required_level) VALUES
('Contra-Ataque', 'ESPECIAL', 'RARE', 'TRAP', 0, 0, 
 '[{"type":"REFLECT","value":0.5,"description":"Reflete 50% do dano"}]',
 'Quando atacado, reflete metade do dano ao oponente', true, 1),
 
('Escudo Mágico', 'ESPECIAL', 'RARE', 'TRAP', 0, 0,
 '[{"type":"SHIELD","value":1,"description":"Anula próximo ataque"}]',
 'Anula completamente o próximo ataque recebido', true, 1),
 
('Roubo de Energia', 'ESPECIAL', 'EPIC', 'TRAP', 0, 0,
 '[{"type":"HEAL","value":10,"description":"Rouba 10 HP"}]',
 'Rouba 10 HP do oponente quando ele joga uma carta', true, 3),
 
('Espelho Reverso', 'ESPECIAL', 'EPIC', 'TRAP', 0, 0,
 '[{"type":"DOUBLE","value":2,"description":"Troca ATK/DEF"}]',
 'Troca o ATK e DEF do monstro inimigo', true, 3),
 
('Emboscada', 'ESPECIAL', 'RARE', 'TRAP', 0, 0,
 '[{"type":"BOOST","value":20,"description":"+20 ATK"}]',
 'Concede +20 ATK ao seu monstro na próxima batalha', true, 2),
 
('Cura Emergencial', 'ESPECIAL', 'LEGENDARY', 'TRAP', 0, 0,
 '[{"type":"HEAL","value":15,"description":"Restaura 15 HP"}]',
 'Restaura 15 HP quando sua vida cair abaixo de 30', true, 5)
ON CONFLICT DO NOTHING;
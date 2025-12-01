-- =============================================
-- Phase 4: Turn Timer System
-- =============================================

-- Add turn_started_at column to battles table
ALTER TABLE battles 
ADD COLUMN IF NOT EXISTS turn_started_at TIMESTAMP WITH TIME ZONE;

-- Update play_card function to reset turn timer and include image_url/rarity
CREATE OR REPLACE FUNCTION play_card(
  p_battle_id UUID,
  p_player_id UUID,
  p_card_id UUID,
  p_position TEXT -- 'MONSTER' or 'TRAP'
)
RETURNS JSONB AS $$
DECLARE
  v_battle battles%ROWTYPE;
  v_game_state JSONB;
  v_player_number TEXT;
  v_player_hand TEXT;
  v_player_field TEXT;
  v_hand_cards JSONB;
  v_card cards%ROWTYPE;
  v_card_index INT;
BEGIN
  -- Get battle
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;

  -- Verify it's player's turn
  IF v_battle.current_turn IS NULL THEN
    RAISE EXCEPTION 'Battle not started';
  END IF;

  -- Determine player number
  IF p_player_id = v_battle.player1_id THEN
    v_player_number := 'PLAYER1';
  ELSIF p_player_id = v_battle.player2_id THEN
    v_player_number := 'PLAYER2';
  ELSE
    RAISE EXCEPTION 'Player not in this battle';
  END IF;

  -- Verify turn
  IF v_battle.current_turn != v_player_number THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_game_state := v_battle.game_state;
  v_player_hand := LOWER(v_player_number) || '_hand';
  v_player_field := LOWER(v_player_number) || '_field';

  -- Get card details
  SELECT * INTO v_card FROM cards WHERE id = p_card_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found';
  END IF;

  -- Get hand
  v_hand_cards := v_game_state->v_player_hand;
  
  -- Find card in hand
  v_card_index := -1;
  FOR i IN 0..jsonb_array_length(v_hand_cards)-1 LOOP
    IF (v_hand_cards->i->>'id')::UUID = p_card_id THEN
      v_card_index := i;
      EXIT;
    END IF;
  END LOOP;

  IF v_card_index = -1 THEN
    RAISE EXCEPTION 'Card not in hand';
  END IF;

  -- Remove from hand
  v_game_state := jsonb_set(
    v_game_state,
    ARRAY[v_player_hand],
    (v_hand_cards - v_card_index)
  );

  -- Place on field
  IF p_position = 'MONSTER' THEN
    -- Check if monster slot is empty
    IF v_game_state->v_player_field->'monster' IS NOT NULL AND 
       v_game_state->v_player_field->>'monster' != 'null' THEN
      RAISE EXCEPTION 'Monster slot already occupied';
    END IF;

    v_game_state := jsonb_set(
      v_game_state,
      ARRAY[v_player_field, 'monster'],
      jsonb_build_object(
        'id', v_card.id,
        'name', v_card.name,
        'atk', v_card.atk,
        'def', v_card.def,
        'effects', COALESCE(v_card.effects, '[]'::jsonb),
        'image_url', v_card.image_url,
        'rarity', v_card.rarity
      )
    );
  ELSIF p_position = 'TRAP' THEN
    v_game_state := jsonb_set(
      v_game_state,
      ARRAY[v_player_field, 'traps'],
      (COALESCE(v_game_state->v_player_field->'traps', '[]'::jsonb) || 
        jsonb_build_object(
          'id', v_card.id,
          'name', v_card.name,
          'effects', COALESCE(v_card.effects, '[]'::jsonb),
          'is_facedown', true,
          'image_url', v_card.image_url,
          'rarity', v_card.rarity
        ))
    );
  END IF;

  -- Update battle with new game state and reset turn timer
  UPDATE battles 
  SET 
    game_state = v_game_state,
    last_action_at = NOW(),
    turn_started_at = NOW()
  WHERE id = p_battle_id;

  RETURN v_game_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update attack function to reset turn timer and switch turn
CREATE OR REPLACE FUNCTION attack(
  p_battle_id UUID,
  p_player_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_battle battles%ROWTYPE;
  v_game_state JSONB;
  v_player_number TEXT;
  v_opponent_number TEXT;
  v_player_field TEXT;
  v_opponent_field TEXT;
  v_player_hp_key TEXT;
  v_opponent_hp_key TEXT;
  v_attacker JSONB;
  v_defender JSONB;
  v_damage INT;
  v_opponent_hp INT;
  v_battle_log JSONB;
BEGIN
  -- Get battle
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;

  -- Determine player
  IF p_player_id = v_battle.player1_id THEN
    v_player_number := 'PLAYER1';
    v_opponent_number := 'PLAYER2';
  ELSIF p_player_id = v_battle.player2_id THEN
    v_player_number := 'PLAYER2';
    v_opponent_number := 'PLAYER1';
  ELSE
    RAISE EXCEPTION 'Player not in this battle';
  END IF;

  -- Verify turn
  IF v_battle.current_turn != v_player_number THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_game_state := v_battle.game_state;
  v_player_field := LOWER(v_player_number) || '_field';
  v_opponent_field := LOWER(v_opponent_number) || '_field';
  v_player_hp_key := LOWER(v_player_number) || '_hp';
  v_opponent_hp_key := LOWER(v_opponent_number) || '_hp';

  -- Get attacker
  v_attacker := v_game_state->v_player_field->'monster';
  IF v_attacker IS NULL OR v_attacker = 'null'::jsonb THEN
    RAISE EXCEPTION 'No monster to attack with';
  END IF;

  -- Get defender
  v_defender := v_game_state->v_opponent_field->'monster';

  -- Calculate damage
  IF v_defender IS NULL OR v_defender = 'null'::jsonb THEN
    -- Direct attack
    v_damage := (v_attacker->>'atk')::INT;
    v_opponent_hp := (v_game_state->>v_opponent_hp_key)::INT - v_damage;
    
    v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_hp_key], to_jsonb(v_opponent_hp));
    
    v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
      jsonb_build_object(
        'action', 'DIRECT_ATTACK',
        'attacker', v_attacker->>'name',
        'damage', v_damage,
        'timestamp', NOW()
      );
  ELSE
    -- Monster battle
    DECLARE
      v_atk INT := (v_attacker->>'atk')::INT;
      v_def INT := (v_defender->>'def')::INT;
    BEGIN
      IF v_atk > v_def THEN
        v_damage := v_atk - v_def;
        v_opponent_hp := (v_game_state->>v_opponent_hp_key)::INT - v_damage;
        v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_hp_key], to_jsonb(v_opponent_hp));
        v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_field, 'monster'], 'null'::jsonb);
        
        v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
          jsonb_build_object(
            'action', 'MONSTER_DESTROYED',
            'attacker', v_attacker->>'name',
            'defender', v_defender->>'name',
            'damage', v_damage,
            'timestamp', NOW()
          );
      ELSIF v_atk < v_def THEN
        v_damage := v_def - v_atk;
        DECLARE v_player_hp INT;
        BEGIN
          v_player_hp := (v_game_state->>v_player_hp_key)::INT - v_damage;
          v_game_state := jsonb_set(v_game_state, ARRAY[v_player_hp_key], to_jsonb(v_player_hp));
        END;
        
        v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
          jsonb_build_object(
            'action', 'ATTACK_FAILED',
            'attacker', v_attacker->>'name',
            'defender', v_defender->>'name',
            'damage', v_damage,
            'timestamp', NOW()
          );
      ELSE
        v_game_state := jsonb_set(v_game_state, ARRAY[v_player_field, 'monster'], 'null'::jsonb);
        v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_field, 'monster'], 'null'::jsonb);
        
        v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
          jsonb_build_object(
            'action', 'MUTUAL_DESTRUCTION',
            'attacker', v_attacker->>'name',
            'defender', v_defender->>'name',
            'timestamp', NOW()
          );
      END IF;
    END;
  END IF;

  v_game_state := jsonb_set(v_game_state, ARRAY['battle_log'], v_battle_log);

  -- Check for victory
  v_opponent_hp := (v_game_state->>v_opponent_hp_key)::INT;
  IF v_opponent_hp <= 0 THEN
    UPDATE battles 
    SET 
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = p_player_id,
      finished_at = NOW(),
      last_action_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN v_game_state;
  END IF;

  -- Switch turn and reset timer
  UPDATE battles 
  SET 
    game_state = v_game_state,
    current_turn = v_opponent_number,
    last_action_at = NOW(),
    turn_started_at = NOW()
  WHERE id = p_battle_id;

  RETURN v_game_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize turn_started_at for existing IN_PROGRESS battles
UPDATE battles
SET turn_started_at = COALESCE(turn_started_at, last_action_at, NOW())
WHERE status = 'IN_PROGRESS';
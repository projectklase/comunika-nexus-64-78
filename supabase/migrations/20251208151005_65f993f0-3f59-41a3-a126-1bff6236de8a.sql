-- Fix monster HP field (use current_hp instead of hp) and trap system (use traps array)

CREATE OR REPLACE FUNCTION public.attack(p_battle_id UUID, p_player_id UUID)
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
  v_player_field JSONB;
  v_opponent_field JSONB;
  v_my_monster JSONB;
  v_enemy_monster JSONB;
  v_my_atk INT;
  v_enemy_hp INT;
  v_damage INT;
  v_opponent_hp INT;
  v_trap JSONB;
  v_trap_effect JSONB;
  v_effect_type TEXT;
  v_effect_value NUMERIC;
  v_reflected_damage INT;
  v_battle_log JSONB;
  v_log_entry JSONB;
  v_current_turn_number INT;
  v_monster_summoned_turn INT;
  v_winner_id UUID;
  v_opponent_id UUID;
  v_burn_damage INT;
  v_player_hp INT;
  v_overflow_damage INT;
  v_opponent_traps JSONB;
  v_new_traps JSONB;
  v_trap_activated BOOLEAN;
  v_shield_blocked BOOLEAN := FALSE;
BEGIN
  -- Fetch battle
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em andamento');
  END IF;
  
  v_game_state := v_battle.game_state;
  v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::JSONB);
  v_current_turn_number := COALESCE((v_game_state->>'turn_number')::INT, 1);
  
  -- Determine player keys
  IF v_battle.player1_id = p_player_id THEN
    v_player_key := 'player1';
    v_opponent_key := 'player2';
    v_opponent_id := v_battle.player2_id;
    IF v_battle.current_turn != 'PLAYER1' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
    END IF;
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_key := 'player2';
    v_opponent_key := 'player1';
    v_opponent_id := v_battle.player1_id;
    IF v_battle.current_turn != 'PLAYER2' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Você não participa desta batalha');
  END IF;
  
  -- Check if in setup phase
  IF COALESCE((v_game_state->>'is_setup_phase')::BOOLEAN, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fase de preparação - ataques não permitidos');
  END IF;
  
  -- Check if already attacked this turn
  IF COALESCE((v_game_state->>'has_attacked_this_turn')::BOOLEAN, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já atacou neste turno');
  END IF;
  
  -- Get fields
  v_player_field := v_game_state->(v_player_key || '_field');
  v_opponent_field := v_game_state->(v_opponent_key || '_field');
  
  -- Get my monster
  v_my_monster := v_player_field->'monster';
  IF v_my_monster IS NULL OR v_my_monster = 'null'::JSONB THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não tem monstro no campo');
  END IF;
  
  -- Check summoning sickness
  v_monster_summoned_turn := COALESCE((v_my_monster->>'summoned_on_turn')::INT, 0);
  IF v_monster_summoned_turn = v_current_turn_number THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monstro recém-invocado não pode atacar');
  END IF;
  
  v_my_atk := COALESCE((v_my_monster->>'atk')::INT, 0);
  
  -- Check for opponent traps (array system)
  v_opponent_traps := COALESCE(v_opponent_field->'traps', '[]'::jsonb);
  v_new_traps := '[]'::jsonb;
  
  FOR v_trap IN SELECT * FROM jsonb_array_elements(v_opponent_traps)
  LOOP
    v_trap_activated := FALSE;
    
    -- Check each effect in the trap
    IF v_trap->'effects' IS NOT NULL AND jsonb_array_length(v_trap->'effects') > 0 THEN
      FOR v_trap_effect IN SELECT * FROM jsonb_array_elements(v_trap->'effects')
      LOOP
        v_effect_type := v_trap_effect->>'type';
        v_effect_value := COALESCE((v_trap_effect->>'value')::NUMERIC, 0);
        
        IF v_effect_type = 'SHIELD' THEN
          -- Block all damage
          v_trap_activated := TRUE;
          v_shield_blocked := TRUE;
          
          v_log_entry := jsonb_build_object(
            'type', 'TRAP_ACTIVATED',
            'trap', v_trap->>'name',
            'effect', 'SHIELD',
            'logged_at', EXTRACT(EPOCH FROM NOW())::TEXT
          );
          v_battle_log := v_battle_log || v_log_entry;
          
        ELSIF v_effect_type IN ('COUNTER', 'REFLECT') THEN
          -- Reflect damage
          v_trap_activated := TRUE;
          
          IF v_effect_value > 0 AND v_effect_value < 1 THEN
            v_reflected_damage := FLOOR(v_my_atk * v_effect_value);
          ELSIF v_effect_value >= 1 THEN
            v_reflected_damage := FLOOR(v_my_atk * (v_effect_value / 100.0));
          ELSE
            v_reflected_damage := FLOOR(v_my_atk * 0.5);
          END IF;
          
          v_player_hp := COALESCE((v_game_state->>(v_player_key || '_hp'))::INT, 100);
          v_player_hp := GREATEST(0, v_player_hp - v_reflected_damage);
          v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hp'], to_jsonb(v_player_hp));
          
          v_log_entry := jsonb_build_object(
            'type', 'TRAP_ACTIVATED',
            'trap', v_trap->>'name',
            'effect', 'REFLECT',
            'damage', v_reflected_damage,
            'logged_at', EXTRACT(EPOCH FROM NOW())::TEXT
          );
          v_battle_log := v_battle_log || v_log_entry;
        END IF;
      END LOOP;
    END IF;
    
    -- If trap was NOT activated, keep it in the field
    IF NOT v_trap_activated THEN
      v_new_traps := v_new_traps || v_trap;
    END IF;
  END LOOP;
  
  -- Update traps array (remove activated traps)
  v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'traps'], v_new_traps);
  
  -- If shield blocked the attack, end here
  IF v_shield_blocked THEN
    v_game_state := jsonb_set(v_game_state, ARRAY['has_attacked_this_turn'], 'true'::JSONB);
    v_game_state := jsonb_set(v_game_state, ARRAY['battle_log'], v_battle_log);
    
    UPDATE battles SET game_state = v_game_state, last_action_at = NOW() WHERE id = p_battle_id;
    RETURN jsonb_build_object('success', true, 'blocked', true, 'trap', 'Shield');
  END IF;
  
  -- Get enemy monster
  v_enemy_monster := v_opponent_field->'monster';
  
  IF v_enemy_monster IS NULL OR v_enemy_monster = 'null'::JSONB THEN
    -- Direct attack to player HP
    v_opponent_hp := COALESCE((v_game_state->>(v_opponent_key || '_hp'))::INT, 100);
    v_damage := v_my_atk;
    v_opponent_hp := GREATEST(0, v_opponent_hp - v_damage);
    
    v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
    
    v_log_entry := jsonb_build_object(
      'type', 'DIRECT_ATTACK',
      'attacker', v_my_monster->>'name',
      'attacker_player', UPPER(v_player_key),
      'damage', v_damage,
      'logged_at', EXTRACT(EPOCH FROM NOW())::TEXT
    );
    v_battle_log := v_battle_log || v_log_entry;
  ELSE
    -- Attack enemy monster - use current_hp (not hp)
    v_enemy_hp := COALESCE((v_enemy_monster->>'current_hp')::INT, (v_enemy_monster->>'def')::INT, 10);
    v_damage := v_my_atk;
    
    -- Reduce enemy monster HP
    v_enemy_hp := v_enemy_hp - v_damage;
    
    IF v_enemy_hp <= 0 THEN
      -- Enemy monster destroyed - calculate overflow damage
      v_overflow_damage := ABS(v_enemy_hp);
      
      -- Apply overflow damage to opponent's HP
      v_opponent_hp := COALESCE((v_game_state->>(v_opponent_key || '_hp'))::INT, 100);
      v_opponent_hp := GREATEST(0, v_opponent_hp - v_overflow_damage);
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
      
      -- Remove enemy monster
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], 'null'::JSONB);
      
      v_log_entry := jsonb_build_object(
        'type', 'MONSTER_DESTROYED',
        'monster', v_enemy_monster->>'name',
        'overflow_damage', v_overflow_damage,
        'logged_at', EXTRACT(EPOCH FROM NOW())::TEXT
      );
      v_battle_log := v_battle_log || v_log_entry;
    ELSE
      -- Update enemy monster HP using current_hp field
      v_enemy_monster := jsonb_set(v_enemy_monster, ARRAY['current_hp'], to_jsonb(v_enemy_hp));
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], v_enemy_monster);
    END IF;
    
    v_log_entry := jsonb_build_object(
      'type', 'ATTACK_MONSTER',
      'attacker', v_my_monster->>'name',
      'attacker_player', UPPER(v_player_key),
      'defender', v_enemy_monster->>'name',
      'damage', v_damage,
      'logged_at', EXTRACT(EPOCH FROM NOW())::TEXT
    );
    v_battle_log := v_battle_log || v_log_entry;
  END IF;
  
  -- Check for BURN effect on my monster
  IF v_my_monster->'effects' IS NOT NULL THEN
    FOR i IN 0..jsonb_array_length(v_my_monster->'effects')-1 LOOP
      IF (v_my_monster->'effects'->i->>'type') = 'BURN' THEN
        v_burn_damage := COALESCE((v_my_monster->'effects'->i->>'value')::INT, 5);
        
        v_opponent_hp := COALESCE((v_game_state->>(v_opponent_key || '_hp'))::INT, 100);
        v_opponent_hp := GREATEST(0, v_opponent_hp - v_burn_damage);
        v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
        
        v_log_entry := jsonb_build_object(
          'type', 'BURN_DAMAGE',
          'damage', v_burn_damage,
          'logged_at', EXTRACT(EPOCH FROM NOW())::TEXT
        );
        v_battle_log := v_battle_log || v_log_entry;
      END IF;
    END LOOP;
  END IF;
  
  -- Mark that attack was performed this turn
  v_game_state := jsonb_set(v_game_state, ARRAY['has_attacked_this_turn'], 'true'::JSONB);
  v_game_state := jsonb_set(v_game_state, ARRAY['battle_log'], v_battle_log);
  
  -- Check for victory
  v_opponent_hp := COALESCE((v_game_state->>(v_opponent_key || '_hp'))::INT, 100);
  
  IF v_opponent_hp <= 0 THEN
    v_winner_id := p_player_id;
    
    UPDATE battles 
    SET game_state = v_game_state, 
        status = 'FINISHED', 
        winner_id = v_winner_id, 
        finished_at = NOW(),
        last_action_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object('success', true, 'victory', true, 'damage', v_damage);
  END IF;
  
  UPDATE battles SET game_state = v_game_state, last_action_at = NOW() WHERE id = p_battle_id;
  
  RETURN jsonb_build_object('success', true, 'damage', v_damage);
END;
$$;
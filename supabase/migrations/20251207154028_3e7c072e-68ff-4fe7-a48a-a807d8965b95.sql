
CREATE OR REPLACE FUNCTION public.attack(p_battle_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_player_key TEXT;
  v_opponent_key TEXT;
  v_player_turn TEXT;
  v_attacker JSONB;
  v_defender JSONB;
  v_attacker_hp INT;
  v_defender_hp INT;
  v_damage INT;
  v_base_atk INT;
  v_opponent_id UUID;
  v_opponent_hp INT;
  v_log_entry JSONB;
  v_battle_log JSONB;
  v_effect JSONB;
  v_trap JSONB;
  v_trap_index INT;
  v_trap_activated BOOLEAN := FALSE;
  v_reflected_damage INT := 0;
  v_shield_block INT := 0;
  v_burn_damage INT := 0;
  v_has_double BOOLEAN := FALSE;
  v_boost_multiplier NUMERIC := 1.0;
  v_log_timestamp TEXT;
  v_current_turn_number INT;
  v_summoned_on_turn INT;
  v_heal_value INT;
  v_max_hp INT;
BEGIN
  -- Fetch battle
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em andamento');
  END IF;
  
  -- Determine player keys
  IF v_battle.player1_id = p_player_id THEN
    v_player_key := 'player1';
    v_opponent_key := 'player2';
    v_player_turn := 'PLAYER1';
    v_opponent_id := v_battle.player2_id;
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_key := 'player2';
    v_opponent_key := 'player1';
    v_player_turn := 'PLAYER2';
    v_opponent_id := v_battle.player1_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Você não está nesta batalha');
  END IF;
  
  -- Check if it's this player's turn
  IF v_battle.current_turn != v_player_turn THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
  END IF;
  
  v_game_state := v_battle.game_state;
  v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb);
  
  -- Check setup phase
  IF COALESCE((v_game_state->>'is_setup_phase')::BOOLEAN, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fase de preparação - ataques não permitidos');
  END IF;
  
  -- Check if already attacked this turn
  IF COALESCE((v_game_state->>'has_attacked_this_turn')::BOOLEAN, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já atacou neste turno');
  END IF;
  
  -- Get attacker monster
  v_attacker := v_game_state->v_player_key->'field'->'monster';
  
  IF v_attacker IS NULL OR v_attacker = 'null'::jsonb THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não tem monstro no campo');
  END IF;
  
  -- Check summoning sickness
  v_current_turn_number := COALESCE((v_game_state->>'turn_number')::INT, 1);
  v_summoned_on_turn := COALESCE((v_attacker->>'summoned_on_turn')::INT, 0);
  
  IF v_summoned_on_turn = v_current_turn_number THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monstro invocado neste turno não pode atacar (Summoning Sickness)');
  END IF;
  
  v_attacker_hp := COALESCE((v_attacker->>'current_hp')::INT, (v_attacker->>'def')::INT);
  v_base_atk := COALESCE((v_attacker->>'atk')::INT, 10);
  
  -- Check for DOUBLE and BOOST effects on attacker
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'DOUBLE' THEN
        v_has_double := TRUE;
      END IF;
      IF v_effect->>'type' = 'BOOST' THEN
        v_boost_multiplier := COALESCE((v_effect->>'value')::NUMERIC, 1.3);
        IF v_boost_multiplier > 10 THEN
          v_base_atk := v_base_atk + v_boost_multiplier::INT;
          v_boost_multiplier := 1.0;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- Apply boost multiplier
  v_damage := FLOOR(v_base_atk * v_boost_multiplier)::INT;
  
  -- Apply DOUBLE effect
  IF v_has_double THEN
    v_damage := v_damage * 2;
  END IF;
  
  -- Get defender monster
  v_defender := v_game_state->v_opponent_key->'field'->'monster';
  
  -- Check opponent's traps before attack resolves
  IF v_game_state->v_opponent_key->'field'->'traps' IS NOT NULL THEN
    FOR v_trap_index IN 0..jsonb_array_length(v_game_state->v_opponent_key->'field'->'traps') - 1
    LOOP
      v_trap := v_game_state->v_opponent_key->'field'->'traps'->v_trap_index;
      
      IF v_trap IS NOT NULL AND v_trap->'effects' IS NOT NULL THEN
        FOR v_effect IN SELECT * FROM jsonb_array_elements(v_trap->'effects')
        LOOP
          v_log_timestamp := extract(epoch from clock_timestamp())::text;
          
          -- REFLECT trap
          IF v_effect->>'type' = 'REFLECT' THEN
            DECLARE
              v_reflect_value NUMERIC := COALESCE((v_effect->>'value')::NUMERIC, 0.5);
            BEGIN
              IF v_reflect_value < 1 THEN
                v_reflected_damage := FLOOR(v_damage * v_reflect_value)::INT;
              ELSE
                v_reflected_damage := FLOOR(v_damage * (v_reflect_value / 100))::INT;
              END IF;
            END;
            v_trap_activated := TRUE;
            
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap->>'name',
              'effect', 'REFLECT',
              'value', v_reflected_damage,
              'message', '🪞 ' || (v_trap->>'name') || ' refletiu ' || v_reflected_damage || ' dano!',
              'logged_at', v_log_timestamp
            );
            v_battle_log := v_battle_log || v_log_entry;
          END IF;
          
          -- SHIELD trap
          IF v_effect->>'type' = 'SHIELD' THEN
            v_shield_block := COALESCE((v_effect->>'value')::INT, v_damage);
            IF v_shield_block >= v_damage THEN
              v_shield_block := v_damage;
              v_damage := 0;
            ELSE
              v_damage := v_damage - v_shield_block;
            END IF;
            v_trap_activated := TRUE;
            
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap->>'name',
              'effect', 'SHIELD',
              'value', v_shield_block,
              'message', '🛡️ ' || (v_trap->>'name') || ' bloqueou ' || v_shield_block || ' dano!',
              'logged_at', v_log_timestamp
            );
            v_battle_log := v_battle_log || v_log_entry;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    
    -- Remove activated traps
    IF v_trap_activated THEN
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key, 'field', 'traps'], '[]'::jsonb);
    END IF;
  END IF;
  
  -- Apply reflected damage to attacker
  IF v_reflected_damage > 0 THEN
    v_attacker_hp := v_attacker_hp - v_reflected_damage;
    v_attacker := jsonb_set(v_attacker, '{current_hp}', to_jsonb(v_attacker_hp));
    v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key, 'field', 'monster'], v_attacker);
  END IF;
  
  -- Process HEAL effect on attacker (heals self when attacking)
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'HEAL' THEN
        v_heal_value := COALESCE((v_effect->>'value')::INT, 5);
        
        -- DOUBLE doubles the heal
        IF v_has_double THEN
          v_heal_value := v_heal_value * 2;
        END IF;
        
        -- Max HP is the initial DEF of the card
        v_max_hp := COALESCE((v_attacker->>'def')::INT, (v_attacker->>'max_hp')::INT, 50);
        v_attacker_hp := LEAST(v_max_hp, v_attacker_hp + v_heal_value);
        
        -- Update attacker HP
        v_attacker := jsonb_set(v_attacker, '{current_hp}', to_jsonb(v_attacker_hp));
        v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key, 'field', 'monster'], v_attacker);
        
        -- Log heal
        v_log_timestamp := extract(epoch from clock_timestamp())::text;
        v_log_entry := jsonb_build_object(
          'type', 'HEAL',
          'value', v_heal_value,
          'monster', v_attacker->>'name',
          'new_hp', v_attacker_hp,
          'max_hp', v_max_hp,
          'attacker_player', UPPER(v_player_key),
          'message', '💚 ' || (v_attacker->>'name') || ' recuperou ' || v_heal_value || ' HP! (' || v_attacker_hp || '/' || v_max_hp || ')',
          'logged_at', v_log_timestamp
        );
        v_battle_log := v_battle_log || v_log_entry;
      END IF;
    END LOOP;
  END IF;
  
  -- Check for BURN effect on attacker
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'BURN' THEN
        v_burn_damage := COALESCE((v_effect->>'value')::INT, 5);
        IF v_has_double THEN
          v_burn_damage := v_burn_damage * 2;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  v_log_timestamp := extract(epoch from clock_timestamp())::text;
  
  -- Attack logic
  IF v_defender IS NOT NULL AND v_defender != 'null'::jsonb THEN
    -- Attack the defender monster
    v_defender_hp := COALESCE((v_defender->>'current_hp')::INT, (v_defender->>'def')::INT);
    v_defender_hp := v_defender_hp - v_damage;
    
    v_log_entry := jsonb_build_object(
      'type', 'ATTACK_MONSTER',
      'attacker', v_attacker->>'name',
      'defender', v_defender->>'name',
      'damage', v_damage,
      'remainingHp', GREATEST(0, v_defender_hp),
      'attacker_player', UPPER(v_player_key),
      'logged_at', v_log_timestamp
    );
    v_battle_log := v_battle_log || v_log_entry;
    
    IF v_defender_hp <= 0 THEN
      -- Monster destroyed
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key, 'field', 'monster'], 'null'::jsonb);
      
      v_log_timestamp := extract(epoch from clock_timestamp())::text;
      v_log_entry := jsonb_build_object(
        'type', 'MONSTER_DESTROYED',
        'monster', v_defender->>'name',
        'by', v_attacker->>'name',
        'message', '💀 ' || (v_defender->>'name') || ' foi destruído!',
        'logged_at', v_log_timestamp
      );
      v_battle_log := v_battle_log || v_log_entry;
      
      -- Excess damage goes to player HP
      IF v_defender_hp < 0 THEN
        v_opponent_hp := COALESCE((v_game_state->>v_opponent_key || '_hp')::INT, 100);
        v_opponent_hp := v_opponent_hp + v_defender_hp;
        v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(GREATEST(0, v_opponent_hp)));
      END IF;
    ELSE
      -- Update defender HP
      v_defender := jsonb_set(v_defender, '{current_hp}', to_jsonb(v_defender_hp));
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key, 'field', 'monster'], v_defender);
    END IF;
  ELSE
    -- Direct attack to player
    v_opponent_hp := COALESCE((v_game_state->>v_opponent_key || '_hp')::INT, 100);
    v_opponent_hp := v_opponent_hp - v_damage;
    v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(GREATEST(0, v_opponent_hp)));
    
    v_log_entry := jsonb_build_object(
      'type', 'DIRECT_ATTACK',
      'attacker', v_attacker->>'name',
      'damage', v_damage,
      'target', v_opponent_key,
      'attacker_player', UPPER(v_player_key),
      'logged_at', v_log_timestamp
    );
    v_battle_log := v_battle_log || v_log_entry;
  END IF;
  
  -- Apply BURN damage to opponent player
  IF v_burn_damage > 0 THEN
    v_opponent_hp := COALESCE((v_game_state->>v_opponent_key || '_hp')::INT, 100);
    v_opponent_hp := v_opponent_hp - v_burn_damage;
    v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(GREATEST(0, v_opponent_hp)));
    
    v_log_timestamp := extract(epoch from clock_timestamp())::text;
    v_log_entry := jsonb_build_object(
      'type', 'BURN_DAMAGE',
      'damage', v_burn_damage,
      'target', v_opponent_key,
      'message', '🔥 Dano de queimadura: ' || v_burn_damage || '!',
      'logged_at', v_log_timestamp
    );
    v_battle_log := v_battle_log || v_log_entry;
  END IF;
  
  -- Check if attacker was destroyed by reflect
  IF v_attacker_hp <= 0 THEN
    v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key, 'field', 'monster'], 'null'::jsonb);
    
    v_log_timestamp := extract(epoch from clock_timestamp())::text;
    v_log_entry := jsonb_build_object(
      'type', 'MONSTER_DESTROYED',
      'monster', v_attacker->>'name',
      'by', 'Dano refletido',
      'message', '💀 ' || (v_attacker->>'name') || ' foi destruído pelo dano refletido!',
      'logged_at', v_log_timestamp
    );
    v_battle_log := v_battle_log || v_log_entry;
  END IF;
  
  -- Mark that player has attacked this turn
  v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
  
  -- Update battle log
  v_game_state := jsonb_set(v_game_state, '{battle_log}', v_battle_log);
  
  -- Check for victory
  v_opponent_hp := COALESCE((v_game_state->>v_opponent_key || '_hp')::INT, 100);
  
  IF v_opponent_hp <= 0 THEN
    -- Grant XP rewards
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 100 WHERE id = p_player_id;
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 50 WHERE id = v_opponent_id;
    
    UPDATE battles SET
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = p_player_id,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'battle_ended', true,
      'winner_id', p_player_id,
      'game_state', v_game_state
    );
  END IF;
  
  -- Update battle state
  UPDATE battles SET
    game_state = v_game_state,
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'game_state', v_game_state,
    'damage_dealt', v_damage,
    'reflected_damage', v_reflected_damage,
    'burn_damage', v_burn_damage
  );
END;
$function$;

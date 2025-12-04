
-- ============================================
-- FIX 1: Update attack RPC - limit 1 attack per turn
-- ============================================
CREATE OR REPLACE FUNCTION public.attack(p_battle_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_attacker JSONB;
  v_defender JSONB;
  v_attacker_atk INT;
  v_defender_hp INT;
  v_attacker_hp INT;
  v_damage INT;
  v_player_key TEXT;
  v_opponent_key TEXT;
  v_opponent_hp INT;
  v_my_hp INT;
  v_effect JSONB;
  v_trap JSONB;
  v_is_frozen BOOLEAN := FALSE;
  v_has_double BOOLEAN := FALSE;
  v_boost_value NUMERIC := 1.0;
  v_shield_value INT := 0;
  v_reflect_pct NUMERIC := 0;
  v_reflected_damage INT := 0;
  v_burn_damage INT := 0;
  v_heal_value INT := 0;
  v_freeze_applied BOOLEAN := FALSE;
  v_battle_log JSONB;
  v_log_entry JSONB;
  v_opponent_traps JSONB;
  v_new_traps JSONB := '[]'::jsonb;
  v_trap_activated BOOLEAN := FALSE;
  v_trap_name TEXT;
  v_new_effects JSONB;
  v_current_turn_number INT;
  v_summoned_on_turn INT;
  v_is_setup_phase BOOLEAN;
  v_has_attacked BOOLEAN;
BEGIN
  -- Buscar batalha
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em andamento');
  END IF;
  
  v_game_state := v_battle.game_state;
  
  -- ===== CHECK SETUP PHASE - BLOCK ATTACKS =====
  v_is_setup_phase := COALESCE((v_game_state->>'is_setup_phase')::BOOLEAN, false);
  IF v_is_setup_phase THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Fase de Preparação! Ataques bloqueados neste turno.',
      'setup_phase', true
    );
  END IF;
  
  -- Verificar turno corretamente
  IF (v_battle.player1_id = p_player_id AND v_battle.current_turn != 'PLAYER1') OR
     (v_battle.player2_id = p_player_id AND v_battle.current_turn != 'PLAYER2') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
  END IF;
  
  -- Verificar se o jogador está na batalha
  IF v_battle.player1_id != p_player_id AND v_battle.player2_id != p_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não está nesta batalha');
  END IF;
  
  -- ===== CHECK IF ALREADY ATTACKED THIS TURN =====
  v_has_attacked := COALESCE((v_game_state->>'has_attacked_this_turn')::BOOLEAN, false);
  IF v_has_attacked THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Você já atacou neste turno! Clique em "Passar Turno" para continuar.',
      'already_attacked', true
    );
  END IF;
  
  -- Obter número do turno atual
  v_current_turn_number := COALESCE((v_game_state->>'turn_number')::INT, 1);
  
  -- Determinar jogador e oponente
  IF v_battle.player1_id = p_player_id THEN
    v_player_key := 'player1';
    v_opponent_key := 'player2';
  ELSE
    v_player_key := 'player2';
    v_opponent_key := 'player1';
  END IF;
  
  -- Obter monstros em campo
  v_attacker := v_game_state->(v_player_key || '_field')->'monster';
  v_defender := v_game_state->(v_opponent_key || '_field')->'monster';
  
  IF v_attacker IS NULL OR v_attacker = 'null'::jsonb THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não tem monstro em campo');
  END IF;
  
  -- ===== SUMMONING SICKNESS CHECK =====
  v_summoned_on_turn := COALESCE((v_attacker->>'summoned_on_turn')::INT, 0);
  IF v_summoned_on_turn >= v_current_turn_number THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Summoning Sickness: ' || (v_attacker->>'name') || ' não pode atacar no turno em que foi invocado!',
      'summoning_sickness', true
    );
  END IF;
  
  -- Inicializar log de batalha
  v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb);
  
  -- ===== PROCESSAR EFEITOS DoT DO INÍCIO DO TURNO (BURN no atacante) =====
  IF v_attacker->'active_effects' IS NOT NULL THEN
    v_new_effects := '[]'::jsonb;
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'active_effects')
    LOOP
      IF v_effect->>'type' = 'BURN' THEN
        v_burn_damage := COALESCE((v_effect->>'value')::INT, 5);
        v_attacker_hp := COALESCE((v_attacker->>'current_hp')::INT, (v_attacker->>'def')::INT, 0);
        v_attacker_hp := v_attacker_hp - v_burn_damage;
        v_attacker := jsonb_set(v_attacker, '{current_hp}', to_jsonb(v_attacker_hp));
        
        v_log_entry := jsonb_build_object(
          'type', 'BURN_DOT',
          'damage', v_burn_damage,
          'target', v_attacker->>'name',
          'message', (v_attacker->>'name') || ' sofre ' || v_burn_damage || ' de queimadura!'
        );
        v_battle_log := v_battle_log || v_log_entry;
        
        IF COALESCE((v_effect->>'turns_remaining')::INT, 0) > 1 THEN
          v_new_effects := v_new_effects || jsonb_build_object(
            'type', 'BURN',
            'value', v_effect->'value',
            'turns_remaining', (v_effect->>'turns_remaining')::INT - 1
          );
        END IF;
      ELSE
        v_new_effects := v_new_effects || v_effect;
      END IF;
    END LOOP;
    v_attacker := jsonb_set(v_attacker, '{active_effects}', v_new_effects);
    v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_field', 'monster'], v_attacker);
    
    IF COALESCE((v_attacker->>'current_hp')::INT, 0) <= 0 THEN
      v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_field', 'monster'], 'null'::jsonb);
      v_log_entry := jsonb_build_object('type', 'MONSTER_DESTROYED', 'monster', v_attacker->>'name', 'cause', 'BURN');
      v_battle_log := v_battle_log || v_log_entry;
      v_game_state := jsonb_set(v_game_state, '{battle_log}', v_battle_log);
      v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
      
      UPDATE battles SET
        game_state = v_game_state,
        last_action_at = NOW(),
        updated_at = NOW()
      WHERE id = p_battle_id;
      
      RETURN jsonb_build_object('success', true, 'monster_died_to_burn', true, 'game_state', v_game_state);
    END IF;
  END IF;
  
  -- Verificar se atacante está FROZEN
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'FREEZE' THEN
        v_is_frozen := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  IF v_is_frozen THEN
    v_attacker := jsonb_set(
      v_attacker,
      '{effects}',
      COALESCE(
        (SELECT jsonb_agg(e) FROM jsonb_array_elements(v_attacker->'effects') e WHERE e->>'type' != 'FREEZE'),
        '[]'::jsonb
      )
    );
    
    v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_field', 'monster'], v_attacker);
    v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
    
    v_log_entry := jsonb_build_object(
      'type', 'FROZEN_SKIP',
      'attacker', v_attacker->>'name',
      'message', (v_attacker->>'name') || ' está congelado e não pode atacar!'
    );
    v_battle_log := v_battle_log || v_log_entry;
    v_game_state := jsonb_set(v_game_state, '{battle_log}', v_battle_log);
    
    UPDATE battles SET
      game_state = v_game_state,
      last_action_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'frozen', true,
      'message', 'Seu monstro estava congelado e não pôde atacar',
      'game_state', v_game_state
    );
  END IF;
  
  -- Obter stats base
  v_attacker_atk := COALESCE((v_attacker->>'atk')::INT, 0);
  v_attacker_hp := COALESCE((v_attacker->>'current_hp')::INT, (v_attacker->>'def')::INT, 0);
  
  -- Verificar se há DOUBLE no atacante
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'DOUBLE' THEN
        v_has_double := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Processar efeitos do ATACANTE (BOOST)
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'BOOST' THEN
        v_boost_value := COALESCE((v_effect->>'value')::NUMERIC, 1.0);
        IF v_boost_value > 10 THEN
          v_attacker_atk := v_attacker_atk + v_boost_value::INT;
          IF v_has_double THEN
            v_attacker_atk := v_attacker_atk + v_boost_value::INT;
          END IF;
        ELSE
          IF v_has_double THEN
            v_attacker_atk := FLOOR(v_attacker_atk * v_boost_value * v_boost_value)::INT;
          ELSE
            v_attacker_atk := FLOOR(v_attacker_atk * v_boost_value)::INT;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- ===== PROCESSAR TRAPS DO OPONENTE =====
  v_opponent_traps := COALESCE(v_game_state->(v_opponent_key || '_field')->'traps', '[]'::jsonb);
  v_new_traps := '[]'::jsonb;
  
  FOR v_trap IN SELECT * FROM jsonb_array_elements(v_opponent_traps)
  LOOP
    v_trap_activated := FALSE;
    v_trap_name := v_trap->>'name';
    
    IF v_trap->'effects' IS NOT NULL THEN
      FOR v_effect IN SELECT * FROM jsonb_array_elements(v_trap->'effects')
      LOOP
        CASE v_effect->>'type'
          WHEN 'SHIELD' THEN
            v_shield_value := v_shield_value + COALESCE((v_effect->>'value')::INT, 0);
            v_trap_activated := TRUE;
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap_name,
              'effect', 'SHIELD',
              'value', v_shield_value,
              'message', '🛡️ ' || v_trap_name || ' ativada! Bloqueia ' || v_shield_value || ' de dano!'
            );
            v_battle_log := v_battle_log || v_log_entry;
            
          WHEN 'REFLECT' THEN
            v_reflect_pct := COALESCE((v_effect->>'value')::NUMERIC, 0);
            v_trap_activated := TRUE;
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap_name,
              'effect', 'REFLECT',
              'value', v_reflect_pct,
              'message', '🪞 ' || v_trap_name || ' ativada! Reflete ' || (v_reflect_pct * 100)::INT || '% do dano!'
            );
            v_battle_log := v_battle_log || v_log_entry;
            
          WHEN 'BURN' THEN
            v_burn_damage := COALESCE((v_effect->>'value')::INT, 5);
            v_attacker := jsonb_set(
              v_attacker,
              '{active_effects}',
              COALESCE(v_attacker->'active_effects', '[]'::jsonb) || 
              jsonb_build_object('type', 'BURN', 'value', v_burn_damage, 'turns_remaining', 3)
            );
            v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_field', 'monster'], v_attacker);
            v_trap_activated := TRUE;
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap_name,
              'effect', 'BURN',
              'value', v_burn_damage,
              'duration', 3,
              'message', '🔥 ' || v_trap_name || ' ativada! ' || (v_attacker->>'name') || ' queima por ' || v_burn_damage || ' dano por 3 turnos!'
            );
            v_battle_log := v_battle_log || v_log_entry;
            
          WHEN 'HEAL' THEN
            v_heal_value := COALESCE((v_effect->>'value')::INT, 0);
            v_opponent_hp := COALESCE((v_game_state->>(v_opponent_key || '_hp'))::INT, 100);
            v_opponent_hp := LEAST(100, v_opponent_hp + v_heal_value);
            v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
            v_trap_activated := TRUE;
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap_name,
              'effect', 'HEAL',
              'value', v_heal_value,
              'message', '💚 ' || v_trap_name || ' ativada! Restaura ' || v_heal_value || ' HP!'
            );
            v_battle_log := v_battle_log || v_log_entry;
            
          WHEN 'FREEZE' THEN
            v_attacker := jsonb_set(
              v_attacker,
              '{effects}',
              COALESCE(v_attacker->'effects', '[]'::jsonb) || jsonb_build_object('type', 'FREEZE', 'value', 1)
            );
            v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_field', 'monster'], v_attacker);
            v_trap_activated := TRUE;
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap_name,
              'effect', 'FREEZE',
              'message', '❄️ ' || v_trap_name || ' ativada! ' || (v_attacker->>'name') || ' está congelado!'
            );
            v_battle_log := v_battle_log || v_log_entry;
            
          ELSE
            NULL;
        END CASE;
      END LOOP;
    END IF;
    
    IF NOT v_trap_activated THEN
      v_new_traps := v_new_traps || v_trap;
    END IF;
  END LOOP;
  
  v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'traps'], v_new_traps);
  
  -- Processar efeitos do DEFENSOR (monstro)
  IF v_defender IS NOT NULL AND v_defender != 'null'::jsonb AND v_defender->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_defender->'effects')
    LOOP
      IF v_effect->>'type' = 'SHIELD' THEN
        v_shield_value := v_shield_value + COALESCE((v_effect->>'value')::INT, 0);
      END IF;
      
      IF v_effect->>'type' = 'REFLECT' THEN
        v_reflect_pct := v_reflect_pct + COALESCE((v_effect->>'value')::NUMERIC, 0);
      END IF;
    END LOOP;
  END IF;
  
  -- Calcular dano após SHIELD
  v_damage := GREATEST(0, v_attacker_atk - v_shield_value);
  
  -- Calcular dano refletido
  IF v_reflect_pct > 0 THEN
    IF v_reflect_pct < 1 THEN
      v_reflected_damage := FLOOR(v_damage * v_reflect_pct)::INT;
    ELSE
      v_reflected_damage := FLOOR(v_damage * v_reflect_pct / 100)::INT;
    END IF;
  END IF;
  
  -- Obter HPs dos jogadores
  v_opponent_hp := COALESCE((v_game_state->>(v_opponent_key || '_hp'))::INT, 100);
  v_my_hp := COALESCE((v_game_state->>(v_player_key || '_hp'))::INT, 100);
  
  -- Se há defensor, aplicar dano ao defensor primeiro
  IF v_defender IS NOT NULL AND v_defender != 'null'::jsonb THEN
    v_defender_hp := COALESCE((v_defender->>'current_hp')::INT, (v_defender->>'def')::INT, 0);
    v_defender_hp := v_defender_hp - v_damage;
    
    v_log_entry := jsonb_build_object(
      'type', 'ATTACK_MONSTER',
      'attacker', v_attacker->>'name',
      'defender', v_defender->>'name',
      'damage', v_damage,
      'remainingHp', GREATEST(0, v_defender_hp)
    );
    v_battle_log := v_battle_log || v_log_entry;
    
    IF v_defender_hp <= 0 THEN
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], 'null'::jsonb);
      
      IF v_defender_hp < 0 THEN
        v_opponent_hp := v_opponent_hp + v_defender_hp;
        
        v_log_entry := jsonb_build_object(
          'type', 'OVERFLOW_DAMAGE',
          'damage', ABS(v_defender_hp),
          'target', v_opponent_key
        );
        v_battle_log := v_battle_log || v_log_entry;
      END IF;
      
      v_log_entry := jsonb_build_object(
        'type', 'MONSTER_DESTROYED',
        'monster', v_defender->>'name'
      );
      v_battle_log := v_battle_log || v_log_entry;
    ELSE
      v_defender := jsonb_set(v_defender, '{current_hp}', to_jsonb(v_defender_hp));
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], v_defender);
    END IF;
  ELSE
    -- Ataque direto ao jogador
    v_opponent_hp := v_opponent_hp - v_damage;
    
    v_log_entry := jsonb_build_object(
      'type', 'DIRECT_ATTACK',
      'attacker', v_attacker->>'name',
      'damage', v_damage,
      'target', v_opponent_key
    );
    v_battle_log := v_battle_log || v_log_entry;
  END IF;
  
  -- Aplicar dano refletido ao atacante
  IF v_reflected_damage > 0 THEN
    v_my_hp := v_my_hp - v_reflected_damage;
    
    v_log_entry := jsonb_build_object(
      'type', 'REFLECT_DAMAGE',
      'damage', v_reflected_damage,
      'target', v_player_key
    );
    v_battle_log := v_battle_log || v_log_entry;
  END IF;
  
  -- Processar efeitos de fim de turno do ATACANTE
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'BURN' THEN
        v_burn_damage := COALESCE((v_effect->>'value')::INT, 5);
        IF v_has_double THEN
          v_burn_damage := v_burn_damage * 2;
        END IF;
        v_opponent_hp := v_opponent_hp - v_burn_damage;
        
        v_log_entry := jsonb_build_object(
          'type', 'BURN_DAMAGE',
          'damage', v_burn_damage,
          'target', v_opponent_key
        );
        v_battle_log := v_battle_log || v_log_entry;
      END IF;
      
      IF v_effect->>'type' = 'HEAL' THEN
        v_heal_value := COALESCE((v_effect->>'value')::INT, 5);
        IF v_has_double THEN
          v_heal_value := v_heal_value * 2;
        END IF;
        v_attacker_hp := v_attacker_hp + v_heal_value;
        v_attacker := jsonb_set(v_attacker, '{current_hp}', to_jsonb(v_attacker_hp));
        v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_field', 'monster'], v_attacker);
        
        v_log_entry := jsonb_build_object(
          'type', 'HEAL',
          'value', v_heal_value,
          'monster', v_attacker->>'name'
        );
        v_battle_log := v_battle_log || v_log_entry;
      END IF;
      
      IF v_effect->>'type' = 'FREEZE' AND NOT v_freeze_applied THEN
        IF v_defender IS NOT NULL AND v_defender != 'null'::jsonb THEN
          v_defender := jsonb_set(
            v_defender,
            '{effects}',
            COALESCE(v_defender->'effects', '[]'::jsonb) || jsonb_build_object('type', 'FREEZE', 'value', 1)
          );
          v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], v_defender);
          v_freeze_applied := TRUE;
          
          v_log_entry := jsonb_build_object(
            'type', 'FREEZE_APPLIED',
            'target', v_defender->>'name'
          );
          v_battle_log := v_battle_log || v_log_entry;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- Atualizar HPs
  v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
  v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hp'], to_jsonb(v_my_hp));
  v_game_state := jsonb_set(v_game_state, '{battle_log}', v_battle_log);
  
  -- ===== MARK THAT PLAYER HAS ATTACKED THIS TURN =====
  v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
  
  -- Verificar vitória/derrota
  IF v_opponent_hp <= 0 AND v_my_hp <= 0 THEN
    UPDATE battles SET
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = NULL,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object('success', true, 'battle_ended', true, 'result', 'DRAW', 'game_state', v_game_state);
  ELSIF v_opponent_hp <= 0 THEN
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 100 WHERE id = p_player_id;
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 50 WHERE id = (
      CASE WHEN v_battle.player1_id = p_player_id THEN v_battle.player2_id ELSE v_battle.player1_id END
    );
    
    UPDATE battles SET
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = p_player_id,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object('success', true, 'battle_ended', true, 'winner_id', p_player_id, 'game_state', v_game_state);
  ELSIF v_my_hp <= 0 THEN
    DECLARE
      v_opponent_id UUID;
    BEGIN
      v_opponent_id := CASE WHEN v_battle.player1_id = p_player_id THEN v_battle.player2_id ELSE v_battle.player1_id END;
      
      UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 100 WHERE id = v_opponent_id;
      UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 50 WHERE id = p_player_id;
      
      UPDATE battles SET
        game_state = v_game_state,
        status = 'FINISHED',
        winner_id = v_opponent_id,
        finished_at = NOW(),
        updated_at = NOW()
      WHERE id = p_battle_id;
      
      RETURN jsonb_build_object('success', true, 'battle_ended', true, 'winner_id', v_opponent_id, 'game_state', v_game_state);
    END;
  END IF;
  
  UPDATE battles SET
    game_state = v_game_state,
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object('success', true, 'game_state', v_game_state, 'attack_complete', true);
END;
$function$;

-- ============================================
-- FIX 2: Update play_card RPC - add summoned_on_turn + limit 1 card per turn
-- ============================================
CREATE OR REPLACE FUNCTION public.play_card(p_battle_id uuid, p_card_id uuid, p_player_id uuid, p_position text DEFAULT 'ATTACK'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_player_hand JSONB;
  v_player_field TEXT;
  v_card RECORD;
  v_card_index INT := -1;
  v_new_hand JSONB := '[]'::jsonb;
  v_i INT;
  v_card_id_in_hand TEXT;
  v_current_monster JSONB;
  v_current_traps JSONB;
  v_current_turn_number INT;
  v_has_played_card BOOLEAN;
BEGIN
  -- Fetch battle
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em andamento');
  END IF;
  
  -- Verify turn
  IF (v_battle.player1_id = p_player_id AND v_battle.current_turn != 'PLAYER1') OR
     (v_battle.player2_id = p_player_id AND v_battle.current_turn != 'PLAYER2') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
  END IF;
  
  v_game_state := v_battle.game_state;
  
  -- ===== CHECK IF ALREADY PLAYED A CARD THIS TURN =====
  v_has_played_card := COALESCE((v_game_state->>'has_played_card_this_turn')::BOOLEAN, false);
  IF v_has_played_card THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Você já jogou uma carta neste turno!',
      'already_played', true
    );
  END IF;
  
  -- Get current turn number
  v_current_turn_number := COALESCE((v_game_state->>'turn_number')::INT, 1);
  
  -- Determine player's hand and field
  IF v_battle.player1_id = p_player_id THEN
    v_player_hand := v_game_state->'player1_hand';
    v_player_field := 'player1_field';
  ELSE
    v_player_hand := v_game_state->'player2_hand';
    v_player_field := 'player2_field';
  END IF;
  
  -- Find card in hand
  FOR v_i IN 0..jsonb_array_length(v_player_hand) - 1 LOOP
    v_card_id_in_hand := v_player_hand->>v_i;
    IF v_card_id_in_hand IS NOT NULL AND v_card_id_in_hand::uuid = p_card_id THEN
      v_card_index := v_i;
      EXIT;
    END IF;
  END LOOP;
  
  IF v_card_index = -1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Carta não encontrada na mão');
  END IF;
  
  -- Get card details
  SELECT * INTO v_card FROM cards WHERE id = p_card_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Carta não existe no banco');
  END IF;
  
  -- Get current field state
  v_current_monster := v_game_state->v_player_field->'monster';
  v_current_traps := COALESCE(v_game_state->v_player_field->'traps', '[]'::jsonb);
  
  -- Handle card based on type
  IF v_card.card_type = 'MONSTER' THEN
    -- Check if there's already a monster
    IF v_current_monster IS NOT NULL AND v_current_monster != 'null'::jsonb THEN
      RETURN jsonb_build_object('success', false, 'error', 'Já existe um monstro em campo. Derrote-o primeiro ou espere ele ser destruído.');
    END IF;
    
    -- Place monster with summoned_on_turn for summoning sickness
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
        'effects', COALESCE(v_card.effects, '[]'::jsonb),
        'image_url', v_card.image_url,
        'rarity', v_card.rarity,
        'summoned_on_turn', v_current_turn_number  -- ✅ FIX: Add summoned_on_turn
      )
    );
    
  ELSIF v_card.card_type = 'TRAP' THEN
    -- Check trap limit (max 3)
    IF jsonb_array_length(v_current_traps) >= 3 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Máximo de 3 armadilhas em campo');
    END IF;
    
    -- Add trap to field
    v_current_traps := v_current_traps || jsonb_build_object(
      'id', v_card.id,
      'name', v_card.name,
      'effects', COALESCE(v_card.effects, '[]'::jsonb),
      'image_url', v_card.image_url,
      'rarity', v_card.rarity
    );
    v_game_state := jsonb_set(v_game_state, ARRAY[v_player_field, 'traps'], v_current_traps);
    
  ELSIF v_card.card_type = 'SPELL' THEN
    -- TODO: Implement spell effects
    RETURN jsonb_build_object('success', false, 'error', 'Cartas de magia ainda não implementadas');
  ELSE
    -- Default: treat as monster
    IF v_current_monster IS NOT NULL AND v_current_monster != 'null'::jsonb THEN
      RETURN jsonb_build_object('success', false, 'error', 'Já existe um monstro em campo');
    END IF;
    
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
        'effects', COALESCE(v_card.effects, '[]'::jsonb),
        'image_url', v_card.image_url,
        'rarity', v_card.rarity,
        'summoned_on_turn', v_current_turn_number  -- ✅ FIX: Add summoned_on_turn
      )
    );
  END IF;
  
  -- Remove card from hand
  FOR v_i IN 0..jsonb_array_length(v_player_hand) - 1 LOOP
    IF v_i != v_card_index THEN
      v_new_hand := v_new_hand || v_player_hand->v_i;
    END IF;
  END LOOP;
  
  -- Update hand in game state
  IF v_battle.player1_id = p_player_id THEN
    v_game_state := jsonb_set(v_game_state, '{player1_hand}', v_new_hand);
  ELSE
    v_game_state := jsonb_set(v_game_state, '{player2_hand}', v_new_hand);
  END IF;
  
  -- ===== MARK THAT PLAYER HAS PLAYED A CARD THIS TURN =====
  v_game_state := jsonb_set(v_game_state, '{has_played_card_this_turn}', 'true'::jsonb);
  
  -- Update battle
  UPDATE battles SET
    game_state = v_game_state,
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'game_state', v_game_state,
    'card_played', jsonb_build_object(
      'id', v_card.id,
      'name', v_card.name,
      'type', v_card.card_type
    )
  );
END;
$function$;

-- ============================================
-- FIX 3: Update end_turn RPC - reset flags + draw card
-- ============================================
CREATE OR REPLACE FUNCTION public.end_turn(p_battle_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_current_turn_number INT;
  v_is_setup_phase BOOLEAN;
  v_next_turn TEXT;
  v_next_player_key TEXT;
  v_next_player_deck JSONB;
  v_next_player_hand JSONB;
  v_drawn_card JSONB;
  v_player_key TEXT;
  v_player_hand JSONB;
  v_player_deck JSONB;
  v_player_monster JSONB;
  v_opponent_id UUID;
BEGIN
  -- Fetch battle
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em andamento');
  END IF;
  
  -- Verify it's this player's turn
  IF (v_battle.player1_id = p_player_id AND v_battle.current_turn != 'PLAYER1') OR
     (v_battle.player2_id = p_player_id AND v_battle.current_turn != 'PLAYER2') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
  END IF;
  
  -- Determine player key
  IF v_battle.player1_id = p_player_id THEN
    v_player_key := 'player1';
    v_opponent_id := v_battle.player2_id;
  ELSE
    v_player_key := 'player2';
    v_opponent_id := v_battle.player1_id;
  END IF;
  
  v_game_state := v_battle.game_state;
  v_current_turn_number := COALESCE((v_game_state->>'turn_number')::INT, 1);
  v_is_setup_phase := COALESCE((v_game_state->>'is_setup_phase')::BOOLEAN, false);
  
  -- Check defeat condition BEFORE passing turn: hand empty + deck empty + no monster
  v_player_hand := COALESCE(v_game_state->(v_player_key || '_hand'), '[]'::jsonb);
  v_player_deck := COALESCE(v_game_state->(v_player_key || '_deck'), '[]'::jsonb);
  v_player_monster := v_game_state->(v_player_key || '_field')->'monster';
  
  IF jsonb_array_length(v_player_hand) = 0 
     AND jsonb_array_length(v_player_deck) = 0 
     AND (v_player_monster IS NULL OR v_player_monster = 'null'::jsonb) THEN
    -- Player loses by deck out
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 100 WHERE id = v_opponent_id;
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 50 WHERE id = p_player_id;
    
    UPDATE battles SET
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = v_opponent_id,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'battle_ended', true, 
      'winner_id', v_opponent_id,
      'reason', 'DECK_OUT',
      'game_state', v_game_state
    );
  END IF;
  
  -- Determine next turn
  IF v_battle.current_turn = 'PLAYER1' THEN
    v_next_turn := 'PLAYER2';
    v_next_player_key := 'player2';
  ELSE
    v_next_turn := 'PLAYER1';
    v_next_player_key := 'player1';
    -- If Player 2 ends their turn during setup phase, setup phase ends
    IF v_is_setup_phase THEN
      v_game_state := jsonb_set(v_game_state, '{is_setup_phase}', 'false'::jsonb);
    END IF;
  END IF;
  
  -- Increment turn number
  v_game_state := jsonb_set(v_game_state, '{turn_number}', to_jsonb(v_current_turn_number + 1));
  
  -- ===== RESET FLAGS FOR NEXT TURN =====
  v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'false'::jsonb);
  v_game_state := jsonb_set(v_game_state, '{has_played_card_this_turn}', 'false'::jsonb);
  
  -- DRAW MECHANIC: Next player draws 1 card from deck to hand
  v_next_player_deck := COALESCE(v_game_state->(v_next_player_key || '_deck'), '[]'::jsonb);
  v_next_player_hand := COALESCE(v_game_state->(v_next_player_key || '_hand'), '[]'::jsonb);
  
  IF jsonb_array_length(v_next_player_deck) > 0 THEN
    -- Get first card from deck
    v_drawn_card := v_next_player_deck->0;
    
    -- Remove first card from deck
    v_next_player_deck := v_next_player_deck - 0;
    
    -- Add card to hand
    v_next_player_hand := v_next_player_hand || jsonb_build_array(v_drawn_card);
    
    -- Update game state
    v_game_state := jsonb_set(v_game_state, ARRAY[v_next_player_key || '_deck'], v_next_player_deck);
    v_game_state := jsonb_set(v_game_state, ARRAY[v_next_player_key || '_hand'], v_next_player_hand);
  END IF;
  
  -- Update battle
  UPDATE battles SET
    game_state = v_game_state,
    current_turn = v_next_turn,
    turn_started_at = NOW(),
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'game_state', v_game_state,
    'setup_phase_ended', (v_is_setup_phase AND v_next_turn = 'PLAYER1'),
    'card_drawn', v_drawn_card IS NOT NULL
  );
END;
$function$;

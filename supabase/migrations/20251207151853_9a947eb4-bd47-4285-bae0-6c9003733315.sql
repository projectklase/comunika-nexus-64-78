-- Adicionar campo attacker_player aos logs de ataque no RPC attack
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
  v_log_timestamp TEXT;
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
        
        v_log_timestamp := extract(epoch from clock_timestamp())::text;
        v_log_entry := jsonb_build_object(
          'type', 'BURN_DOT',
          'damage', v_burn_damage,
          'target', v_attacker->>'name',
          'attacker_player', UPPER(v_player_key),
          'message', (v_attacker->>'name') || ' sofre ' || v_burn_damage || ' de queimadura!',
          'logged_at', v_log_timestamp
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
      v_log_timestamp := extract(epoch from clock_timestamp())::text;
      v_log_entry := jsonb_build_object('type', 'MONSTER_DESTROYED', 'monster', v_attacker->>'name', 'cause', 'BURN', 'attacker_player', UPPER(v_player_key), 'logged_at', v_log_timestamp);
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
    
    v_log_timestamp := extract(epoch from clock_timestamp())::text;
    v_log_entry := jsonb_build_object(
      'type', 'FROZEN_SKIP',
      'attacker', v_attacker->>'name',
      'attacker_player', UPPER(v_player_key),
      'message', (v_attacker->>'name') || ' está congelado e não pode atacar!',
      'logged_at', v_log_timestamp
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
            v_log_timestamp := extract(epoch from clock_timestamp())::text;
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap_name,
              'effect', 'SHIELD',
              'value', v_shield_value,
              'attacker_player', UPPER(v_player_key),
              'message', '🛡️ ' || v_trap_name || ' ativada! Bloqueia ' || v_shield_value || ' de dano!',
              'logged_at', v_log_timestamp
            );
            v_battle_log := v_battle_log || v_log_entry;
            
          WHEN 'REFLECT' THEN
            v_reflect_pct := COALESCE((v_effect->>'value')::NUMERIC, 0);
            v_trap_activated := TRUE;
            v_log_timestamp := extract(epoch from clock_timestamp())::text;
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap_name,
              'effect', 'REFLECT',
              'value', v_reflect_pct,
              'attacker_player', UPPER(v_player_key),
              'message', '🪞 ' || v_trap_name || ' ativada! Reflete ' || (v_reflect_pct * 100)::INT || '% do dano!',
              'logged_at', v_log_timestamp
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
            v_log_timestamp := extract(epoch from clock_timestamp())::text;
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap_name,
              'effect', 'BURN',
              'value', v_burn_damage,
              'duration', 3,
              'attacker_player', UPPER(v_player_key),
              'message', '🔥 ' || v_trap_name || ' ativada! ' || (v_attacker->>'name') || ' queima por ' || v_burn_damage || ' dano por 3 turnos!',
              'logged_at', v_log_timestamp
            );
            v_battle_log := v_battle_log || v_log_entry;
            
          WHEN 'HEAL' THEN
            v_heal_value := COALESCE((v_effect->>'value')::INT, 0);
            v_opponent_hp := COALESCE((v_game_state->>(v_opponent_key || '_hp'))::INT, 100);
            v_opponent_hp := LEAST(100, v_opponent_hp + v_heal_value);
            v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
            v_trap_activated := TRUE;
            v_log_timestamp := extract(epoch from clock_timestamp())::text;
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap_name,
              'effect', 'HEAL',
              'value', v_heal_value,
              'attacker_player', UPPER(v_player_key),
              'message', '💚 ' || v_trap_name || ' ativada! Restaura ' || v_heal_value || ' HP!',
              'logged_at', v_log_timestamp
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
            v_log_timestamp := extract(epoch from clock_timestamp())::text;
            v_log_entry := jsonb_build_object(
              'type', 'TRAP_ACTIVATED',
              'trap', v_trap_name,
              'effect', 'FREEZE',
              'attacker_player', UPPER(v_player_key),
              'message', '❄️ ' || v_trap_name || ' ativada! ' || (v_attacker->>'name') || ' está congelado!',
              'logged_at', v_log_timestamp
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
    
    v_log_timestamp := extract(epoch from clock_timestamp())::text;
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
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], 'null'::jsonb);
      
      IF v_defender_hp < 0 THEN
        v_opponent_hp := v_opponent_hp + v_defender_hp;
        
        v_log_timestamp := extract(epoch from clock_timestamp())::text;
        v_log_entry := jsonb_build_object(
          'type', 'OVERFLOW_DAMAGE',
          'damage', ABS(v_defender_hp),
          'target', v_opponent_key,
          'attacker_player', UPPER(v_player_key),
          'logged_at', v_log_timestamp
        );
        v_battle_log := v_battle_log || v_log_entry;
      END IF;
      
      v_log_timestamp := extract(epoch from clock_timestamp())::text;
      v_log_entry := jsonb_build_object(
        'type', 'MONSTER_DESTROYED',
        'monster', v_defender->>'name',
        'attacker_player', UPPER(v_player_key),
        'logged_at', v_log_timestamp
      );
      v_battle_log := v_battle_log || v_log_entry;
    ELSE
      v_defender := jsonb_set(v_defender, '{current_hp}', to_jsonb(v_defender_hp));
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], v_defender);
    END IF;
  ELSE
    -- Ataque direto ao jogador
    v_opponent_hp := v_opponent_hp - v_damage;
    
    v_log_timestamp := extract(epoch from clock_timestamp())::text;
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
  
  -- Aplicar dano refletido ao atacante
  IF v_reflected_damage > 0 THEN
    v_my_hp := v_my_hp - v_reflected_damage;
    
    v_log_timestamp := extract(epoch from clock_timestamp())::text;
    v_log_entry := jsonb_build_object(
      'type', 'REFLECT_DAMAGE',
      'damage', v_reflected_damage,
      'target', v_player_key,
      'attacker_player', UPPER(v_player_key),
      'logged_at', v_log_timestamp
    );
    v_battle_log := v_battle_log || v_log_entry;
  END IF;
  
  -- Atualizar HPs
  v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
  v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hp'], to_jsonb(v_my_hp));
  v_game_state := jsonb_set(v_game_state, '{battle_log}', v_battle_log);
  
  -- ===== MARCAR QUE JÁ ATACOU NESTE TURNO =====
  v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
  
  -- Verificar vitória/derrota
  IF v_opponent_hp <= 0 THEN
    UPDATE battles SET
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = p_player_id,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    -- Conceder XP ao vencedor (100 XP) e perdedor (50 XP)
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 100 WHERE id = p_player_id;
    
    IF v_player_key = 'player1' THEN
      UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 50 WHERE id = v_battle.player2_id;
    ELSE
      UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 50 WHERE id = v_battle.player1_id;
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'winner', p_player_id,
      'game_state', v_game_state
    );
  END IF;
  
  IF v_my_hp <= 0 THEN
    DECLARE
      v_opponent_id UUID;
    BEGIN
      IF v_player_key = 'player1' THEN
        v_opponent_id := v_battle.player2_id;
      ELSE
        v_opponent_id := v_battle.player1_id;
      END IF;
      
      UPDATE battles SET
        game_state = v_game_state,
        status = 'FINISHED',
        winner_id = v_opponent_id,
        finished_at = NOW(),
        updated_at = NOW()
      WHERE id = p_battle_id;
      
      -- Conceder XP ao vencedor (100 XP) e perdedor (50 XP)
      UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 100 WHERE id = v_opponent_id;
      UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 50 WHERE id = p_player_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'winner', v_opponent_id,
        'game_state', v_game_state
      );
    END;
  END IF;
  
  -- Atualizar batalha normalmente (sem trocar turno - isso é feito pelo end_turn)
  UPDATE battles SET
    game_state = v_game_state,
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'damage', v_damage,
    'reflected_damage', v_reflected_damage,
    'game_state', v_game_state
  );
END;
$function$;
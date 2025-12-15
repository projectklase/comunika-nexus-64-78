-- Restaura a função attack para versão funcional com SWAP_STATS e DRAIN corretos
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
  v_attacker JSONB;
  v_defender JSONB;
  v_attacker_atk INT;
  v_defender_hp INT;
  v_defender_max_hp INT;
  v_damage INT;
  v_new_hp INT;
  v_battle_log JSONB;
  v_log_entry JSONB;
  v_winner_id UUID;
  v_player_hp INT;
  v_opponent_hp INT;
  v_opponent_id UUID;
  v_effect JSONB;
  v_effect_type TEXT;
  v_heal_amount INT;
  v_freeze_duration INT;
  v_attacker_rarity TEXT;
  v_logged_at TEXT;
  v_trap JSONB;
  v_trap_effect JSONB;
  v_trap_effect_type TEXT;
  v_trap_name TEXT;
  v_trap_activated BOOLEAN := FALSE;
  v_reflect_damage INT;
  v_reduce_amount INT;
  v_temp_atk INT;
  v_temp_def INT;
  v_boost_amount INT;
  v_new_atk INT;
  v_drain_amount INT;
  v_defender_monster JSONB;
  v_attacker_frozen_until TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Busca a batalha
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batalha não encontrada';
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Batalha não está em andamento';
  END IF;
  
  -- Determina qual jogador está atacando
  IF v_battle.player1_id = p_player_id THEN
    v_player_key := 'player1';
    v_opponent_key := 'player2';
    v_opponent_id := v_battle.player2_id;
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_key := 'player2';
    v_opponent_key := 'player1';
    v_opponent_id := v_battle.player1_id;
  ELSE
    RAISE EXCEPTION 'Jogador não pertence a esta batalha';
  END IF;
  
  -- Verifica se é o turno do jogador
  IF v_battle.current_turn != v_player_key THEN
    RAISE EXCEPTION 'Não é seu turno';
  END IF;
  
  v_game_state := v_battle.game_state;
  v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb);
  
  -- Gera timestamp legível para o log
  v_logged_at := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS');
  
  -- Verifica se há monstro atacante
  v_attacker := v_game_state->(v_player_key || '_field')->'monster';
  IF v_attacker IS NULL OR v_attacker = 'null'::jsonb THEN
    RAISE EXCEPTION 'Você não tem monstro em campo para atacar';
  END IF;
  
  -- ===== VERIFICAÇÃO DE FREEZE (CONGELAMENTO) =====
  v_attacker_frozen_until := (v_attacker->>'frozen_until')::TIMESTAMPTZ;
  IF v_attacker_frozen_until IS NOT NULL AND v_attacker_frozen_until > v_now THEN
    -- Monstro ainda está congelado
    v_log_entry := jsonb_build_object(
      'type', 'ATTACK_BLOCKED',
      'action', 'FROZEN',
      'attacker', v_attacker->>'name',
      'message', '❄️ ' || (v_attacker->>'name') || ' está congelado e não pode atacar!',
      'frozen_until', v_attacker_frozen_until,
      'logged_at', v_logged_at,
      'timestamp', NOW()
    );
    v_battle_log := v_battle_log || v_log_entry;
    v_game_state := jsonb_set(v_game_state, '{battle_log}', v_battle_log);
    
    UPDATE battles SET game_state = v_game_state, updated_at = NOW() WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', FALSE,
      'blocked', TRUE,
      'reason', 'FROZEN',
      'message', (v_attacker->>'name') || ' está congelado e não pode atacar!'
    );
  END IF;
  
  -- Verifica se há monstro defensor
  v_defender := v_game_state->(v_opponent_key || '_field')->'monster';
  IF v_defender IS NULL OR v_defender = 'null'::jsonb THEN
    RAISE EXCEPTION 'Oponente não tem monstro em campo';
  END IF;
  
  -- Obtém stats
  v_attacker_atk := COALESCE((v_attacker->>'atk')::INT, 0);
  v_defender_hp := COALESCE((v_defender->>'current_hp')::INT, (v_defender->>'def')::INT, 0);
  v_defender_max_hp := COALESCE((v_defender->>'max_hp')::INT, (v_defender->>'def')::INT, v_defender_hp);
  v_attacker_rarity := COALESCE(v_attacker->>'rarity', 'COMMON');
  
  -- Obtém HP dos jogadores
  v_player_hp := COALESCE((v_game_state->(v_player_key || '_hp'))::INT, 30);
  v_opponent_hp := COALESCE((v_game_state->(v_opponent_key || '_hp'))::INT, 30);
  
  -- ===== VERIFICAÇÃO DE TRAPS DO DEFENSOR =====
  IF jsonb_array_length(COALESCE(v_game_state->(v_opponent_key || '_field')->'traps', '[]'::jsonb)) > 0 THEN
    v_trap := (v_game_state->(v_opponent_key || '_field')->'traps')->0;
    v_trap_name := COALESCE(v_trap->>'name', 'Armadilha');
    
    IF v_trap->'effects' IS NOT NULL AND jsonb_array_length(v_trap->'effects') > 0 THEN
      v_trap_effect := (v_trap->'effects')->0;
      v_trap_effect_type := v_trap_effect->>'type';
      
      CASE v_trap_effect_type
        WHEN 'REFLECT' THEN
          v_reflect_damage := GREATEST(1, v_attacker_atk / 2);
          v_player_hp := v_player_hp - v_reflect_damage;
          v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hp'], to_jsonb(v_player_hp));
          v_trap_activated := TRUE;
          v_damage := 0;
          v_log_entry := jsonb_build_object(
            'type', 'TRAP_ACTIVATED',
            'action', 'TRAP_ACTIVATED',
            'trap', v_trap_name,
            'effect', 'REFLECT',
            'damage_reflected', v_reflect_damage,
            'message', '🪤 ' || v_trap_name || ' ativada! ' || v_reflect_damage || ' de dano refletido para ' || (v_attacker->>'name') || '!',
            'logged_at', v_logged_at,
            'timestamp', NOW()
          );
          v_battle_log := v_battle_log || v_log_entry;
        
        WHEN 'REDUCE' THEN
          v_reduce_amount := COALESCE((v_trap_effect->>'value')::INT, 50);
          v_damage := GREATEST(0, v_attacker_atk - (v_attacker_atk * v_reduce_amount / 100));
          v_trap_activated := TRUE;
          v_log_entry := jsonb_build_object(
            'type', 'TRAP_ACTIVATED',
            'action', 'TRAP_ACTIVATED',
            'trap', v_trap_name,
            'effect', 'REDUCE',
            'original_damage', v_attacker_atk,
            'reduced_damage', v_damage,
            'message', '🛡️ ' || v_trap_name || ' ativada! Dano reduzido de ' || v_attacker_atk || ' para ' || v_damage || '!',
            'logged_at', v_logged_at,
            'timestamp', NOW()
          );
          v_battle_log := v_battle_log || v_log_entry;
        
        WHEN 'SHIELD' THEN
          v_damage := 0;
          v_trap_activated := TRUE;
          v_log_entry := jsonb_build_object(
            'type', 'TRAP_ACTIVATED',
            'action', 'TRAP_ACTIVATED',
            'trap', v_trap_name,
            'effect', 'SHIELD',
            'message', '🛡️ ' || v_trap_name || ' ativada! Ataque completamente bloqueado!',
            'logged_at', v_logged_at,
            'timestamp', NOW()
          );
          v_battle_log := v_battle_log || v_log_entry;
        
        WHEN 'NULLIFY' THEN
          v_damage := 0;
          v_trap_activated := TRUE;
          v_log_entry := jsonb_build_object(
            'type', 'TRAP_ACTIVATED',
            'action', 'TRAP_ACTIVATED',
            'trap', v_trap_name,
            'effect', 'NULLIFY',
            'message', '✨ ' || v_trap_name || ' ativada! Ataque anulado!',
            'logged_at', v_logged_at,
            'timestamp', NOW()
          );
          v_battle_log := v_battle_log || v_log_entry;
        
        WHEN 'SWAP_STATS' THEN
          -- CORRIGIDO: Troca ATK com current_hp para inversão visual correta
          v_temp_atk := COALESCE((v_attacker->>'atk')::INT, 0);
          v_temp_def := COALESCE((v_attacker->>'current_hp')::INT, (v_attacker->>'def')::INT, 0);
          
          -- Novo ATK = HP antigo, Novo HP = ATK antigo
          v_attacker := jsonb_set(v_attacker, '{atk}', to_jsonb(v_temp_def));
          v_attacker := jsonb_set(v_attacker, '{current_hp}', to_jsonb(v_temp_atk));
          v_attacker := jsonb_set(v_attacker, '{max_hp}', to_jsonb(v_temp_atk));
          v_attacker := jsonb_set(v_attacker, '{def}', to_jsonb(v_temp_atk));
          
          -- Atualiza ATK para o cálculo de dano deste turno
          v_attacker_atk := v_temp_def;
          v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_field', 'monster'], v_attacker);
          v_trap_activated := TRUE;
          v_log_entry := jsonb_build_object(
            'type', 'TRAP_ACTIVATED',
            'action', 'TRAP_ACTIVATED',
            'trap', v_trap_name,
            'effect', 'SWAP_STATS',
            'old_atk', v_temp_atk,
            'old_hp', v_temp_def,
            'new_atk', v_temp_def,
            'new_hp', v_temp_atk,
            'message', '🪞 ' || v_trap_name || ' ativada! ATK e HP de ' || (v_attacker->>'name') || ' foram invertidos! (ATK: ' || v_temp_atk || '→' || v_temp_def || ', HP: ' || v_temp_def || '→' || v_temp_atk || ')',
            'logged_at', v_logged_at,
            'timestamp', NOW()
          );
          v_battle_log := v_battle_log || v_log_entry;
        
        WHEN 'BOOST' THEN
          v_boost_amount := COALESCE((v_trap_effect->>'value')::INT, 20);
          v_defender_monster := v_game_state->(v_opponent_key || '_field')->'monster';
          IF v_defender_monster IS NOT NULL AND v_defender_monster != 'null'::jsonb THEN
            v_new_atk := COALESCE((v_defender_monster->>'atk')::INT, 0) + v_boost_amount;
            v_defender_monster := jsonb_set(v_defender_monster, '{atk}', to_jsonb(v_new_atk));
            v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], v_defender_monster);
          END IF;
          v_trap_activated := TRUE;
          v_log_entry := jsonb_build_object(
            'type', 'TRAP_ACTIVATED',
            'action', 'TRAP_ACTIVATED',
            'trap', v_trap_name,
            'effect', 'BOOST',
            'boost_amount', v_boost_amount,
            'message', '⚔️ ' || v_trap_name || ' ativada! ' || COALESCE(v_defender_monster->>'name', 'Monstro') || ' ganhou +' || v_boost_amount || ' ATK!',
            'logged_at', v_logged_at,
            'timestamp', NOW()
          );
          v_battle_log := v_battle_log || v_log_entry;
        
        WHEN 'DRAIN' THEN
          -- CORRIGIDO: Drena HP do ATACANTE e cura o DEFENSOR (dono da trap)
          v_drain_amount := COALESCE((v_trap_effect->>'value')::INT, 10);
          v_player_hp := GREATEST(0, v_player_hp - v_drain_amount);
          v_opponent_hp := LEAST(30, v_opponent_hp + v_drain_amount);
          v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hp'], to_jsonb(v_player_hp));
          v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
          v_trap_activated := TRUE;
          v_log_entry := jsonb_build_object(
            'type', 'TRAP_ACTIVATED',
            'action', 'TRAP_ACTIVATED',
            'trap', v_trap_name,
            'effect', 'DRAIN',
            'drain_amount', v_drain_amount,
            'message', '💀 ' || v_trap_name || ' ativada! Drenou ' || v_drain_amount || ' HP do atacante!',
            'logged_at', v_logged_at,
            'timestamp', NOW()
          );
          v_battle_log := v_battle_log || v_log_entry;
        
        ELSE
          NULL;
      END CASE;
      
      -- Remove a trap após ativação
      IF v_trap_activated THEN
        v_game_state := jsonb_set(
          v_game_state, 
          ARRAY[v_opponent_key || '_field', 'traps'], 
          '[]'::jsonb
        );
      END IF;
    END IF;
  END IF;
  
  -- Se não foi calculado pelos efeitos, calcula dano normal
  IF v_damage IS NULL THEN
    v_damage := v_attacker_atk;
  END IF;
  
  -- Aplica dano ao defensor (se houver dano)
  IF v_damage > 0 THEN
    v_new_hp := GREATEST(0, v_defender_hp - v_damage);
    v_defender := jsonb_set(v_defender, '{current_hp}', to_jsonb(v_new_hp));
    
    -- Log de ataque
    v_log_entry := jsonb_build_object(
      'type', 'ATTACK',
      'action', 'ATTACK',
      'attacker', v_attacker->>'name',
      'defender', v_defender->>'name',
      'damage', v_damage,
      'defender_hp_before', v_defender_hp,
      'defender_hp_after', v_new_hp,
      'message', '⚔️ ' || (v_attacker->>'name') || ' atacou ' || (v_defender->>'name') || ' causando ' || v_damage || ' de dano!',
      'logged_at', v_logged_at,
      'timestamp', NOW()
    );
    v_battle_log := v_battle_log || v_log_entry;
    
    -- Verifica se o defensor morreu
    IF v_new_hp <= 0 THEN
      v_log_entry := jsonb_build_object(
        'type', 'MONSTER_DESTROYED',
        'action', 'MONSTER_DESTROYED',
        'monster', v_defender->>'name',
        'destroyed_by', v_attacker->>'name',
        'message', '💀 ' || (v_defender->>'name') || ' foi destruído!',
        'logged_at', v_logged_at,
        'timestamp', NOW()
      );
      v_battle_log := v_battle_log || v_log_entry;
      
      -- Remove monstro do campo
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], 'null'::jsonb);
      
      -- Dano ao HP do jogador oponente (overflow)
      IF v_damage > v_defender_hp THEN
        v_opponent_hp := GREATEST(0, v_opponent_hp - (v_damage - v_defender_hp));
        v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
        
        v_log_entry := jsonb_build_object(
          'type', 'OVERFLOW_DAMAGE',
          'action', 'OVERFLOW_DAMAGE',
          'damage', v_damage - v_defender_hp,
          'target_hp_after', v_opponent_hp,
          'message', '💥 Dano excedente: ' || (v_damage - v_defender_hp) || ' ao jogador!',
          'logged_at', v_logged_at,
          'timestamp', NOW()
        );
        v_battle_log := v_battle_log || v_log_entry;
      END IF;
    ELSE
      -- Atualiza HP do defensor
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], v_defender);
    END IF;
  ELSE
    -- Log de ataque bloqueado (dano = 0)
    v_log_entry := jsonb_build_object(
      'type', 'ATTACK_BLOCKED',
      'action', 'ATTACK_BLOCKED',
      'attacker', v_attacker->>'name',
      'defender', v_defender->>'name',
      'message', '🛡️ Ataque de ' || (v_attacker->>'name') || ' foi completamente bloqueado!',
      'logged_at', v_logged_at,
      'timestamp', NOW()
    );
    v_battle_log := v_battle_log || v_log_entry;
  END IF;
  
  -- ===== EFEITOS DO ATACANTE (HEAL, FREEZE) =====
  IF v_attacker->'effects' IS NOT NULL AND jsonb_array_length(v_attacker->'effects') > 0 THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      v_effect_type := v_effect->>'type';
      
      CASE v_effect_type
        WHEN 'HEAL' THEN
          -- Cura baseada na raridade
          CASE v_attacker_rarity
            WHEN 'LEGENDARY' THEN v_heal_amount := 6;
            WHEN 'EPIC' THEN v_heal_amount := 5;
            WHEN 'RARE' THEN v_heal_amount := 4;
            ELSE v_heal_amount := 3;
          END CASE;
          
          v_player_hp := LEAST(30, v_player_hp + v_heal_amount);
          v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hp'], to_jsonb(v_player_hp));
          
          v_log_entry := jsonb_build_object(
            'type', 'HEAL',
            'action', 'HEAL',
            'healer', v_attacker->>'name',
            'amount', v_heal_amount,
            'player_hp_after', v_player_hp,
            'message', '💚 ' || (v_attacker->>'name') || ' curou ' || v_heal_amount || ' HP!',
            'logged_at', v_logged_at,
            'timestamp', NOW()
          );
          v_battle_log := v_battle_log || v_log_entry;
        
        WHEN 'FREEZE' THEN
          -- Duração baseada na raridade
          CASE v_attacker_rarity
            WHEN 'LEGENDARY' THEN v_freeze_duration := 2;
            WHEN 'EPIC' THEN v_freeze_duration := 2;
            ELSE v_freeze_duration := 1;
          END CASE;
          
          -- Aplica freeze ao defensor se ainda existir
          v_defender := v_game_state->(v_opponent_key || '_field')->'monster';
          IF v_defender IS NOT NULL AND v_defender != 'null'::jsonb THEN
            v_defender := jsonb_set(v_defender, '{frozen_until}', to_jsonb((v_now + (v_freeze_duration || ' minutes')::INTERVAL)::TEXT));
            v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_field', 'monster'], v_defender);
            
            v_log_entry := jsonb_build_object(
              'type', 'FREEZE',
              'action', 'FREEZE',
              'freezer', v_attacker->>'name',
              'target', v_defender->>'name',
              'duration', v_freeze_duration,
              'message', '❄️ ' || (v_attacker->>'name') || ' congelou ' || (v_defender->>'name') || ' por ' || v_freeze_duration || ' turno(s)!',
              'logged_at', v_logged_at,
              'timestamp', NOW()
            );
            v_battle_log := v_battle_log || v_log_entry;
          END IF;
        
        ELSE
          NULL;
      END CASE;
    END LOOP;
  END IF;
  
  -- Atualiza log
  v_game_state := jsonb_set(v_game_state, '{battle_log}', v_battle_log);
  
  -- Verifica vitória
  IF v_opponent_hp <= 0 THEN
    v_winner_id := p_player_id;
    
    UPDATE battles 
    SET 
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = v_winner_id,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    -- XP: 10 para vencedor, 3 para perdedor
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 10 WHERE id = v_winner_id;
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 3 WHERE id = v_opponent_id;
    
    RETURN jsonb_build_object(
      'success', TRUE,
      'game_over', TRUE,
      'winner_id', v_winner_id,
      'damage', v_damage,
      'trap_activated', v_trap_activated
    );
  END IF;
  
  IF v_player_hp <= 0 THEN
    v_winner_id := v_opponent_id;
    
    UPDATE battles 
    SET 
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = v_winner_id,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    -- XP: 10 para vencedor, 3 para perdedor
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 10 WHERE id = v_winner_id;
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 3 WHERE id = p_player_id;
    
    RETURN jsonb_build_object(
      'success', TRUE,
      'game_over', TRUE,
      'winner_id', v_winner_id,
      'damage', v_damage,
      'trap_activated', v_trap_activated
    );
  END IF;
  
  -- Atualiza game state
  UPDATE battles 
  SET 
    game_state = v_game_state,
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'damage', v_damage,
    'trap_activated', v_trap_activated,
    'defender_hp', CASE WHEN v_new_hp IS NOT NULL THEN v_new_hp ELSE v_defender_hp END
  );
END;
$function$;
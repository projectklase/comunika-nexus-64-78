-- RESTAURAÇÃO DA FUNÇÃO ATTACK FUNCIONAL (20251215142400)
-- ADIÇÃO DE SWAP_STATS E DRAIN NO FORMATO CORRETO
-- PADRÃO CRÍTICO: v_player_turn = 'PLAYER1' (MAIÚSCULO) para verificação de turno
-- PADRÃO CRÍTICO: v_attacker_field = 'player1_field' (minúsculo) para game_state

DROP FUNCTION IF EXISTS public.attack(uuid, uuid);

CREATE OR REPLACE FUNCTION public.attack(p_battle_id UUID, p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_attacker_field TEXT;
  v_defender_field TEXT;
  v_attacker_hp_key TEXT;
  v_defender_hp_key TEXT;
  v_player_turn TEXT;
  v_attacker_monster JSONB;
  v_defender_monster JSONB;
  v_damage INT;
  v_defender_hp INT;
  v_attacker_hp INT;
  v_effect JSONB;
  v_effect_type TEXT;
  v_effect_value NUMERIC;
  v_trap JSONB;
  v_remaining_traps JSONB;
  v_trap_activated BOOLEAN := false;
  v_trap_message TEXT := '';
  v_winner_id UUID := NULL;
  v_loser_id UUID := NULL;
  v_current_turn_number INT;
  v_summoned_on_turn INT;
  v_week_start DATE;
  v_reflect_damage INT;
  v_defender_traps JSONB;
  v_logged_at TEXT;
  v_overflow INT;
  v_attack_type TEXT;
  v_burn_damage INT := 0;
  v_heal_amount INT := 0;
  v_freeze_applied BOOLEAN := false;
  v_boost_multiplier NUMERIC := 1.0;
BEGIN
  v_logged_at := EXTRACT(EPOCH FROM NOW())::TEXT;

  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batalha não encontrada';
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Batalha não está em andamento';
  END IF;
  
  -- CRÍTICO: v_player_turn em MAIÚSCULAS, v_attacker_field em minúsculas
  IF v_battle.player1_id = p_player_id THEN
    v_attacker_field := 'player1_field';
    v_defender_field := 'player2_field';
    v_attacker_hp_key := 'player1_hp';
    v_defender_hp_key := 'player2_hp';
    v_player_turn := 'PLAYER1';
  ELSIF v_battle.player2_id = p_player_id THEN
    v_attacker_field := 'player2_field';
    v_defender_field := 'player1_field';
    v_attacker_hp_key := 'player2_hp';
    v_defender_hp_key := 'player1_hp';
    v_player_turn := 'PLAYER2';
  ELSE
    RAISE EXCEPTION 'Você não está nesta batalha';
  END IF;
  
  -- Verificação de turno (current_turn é MAIÚSCULO no banco)
  IF v_battle.current_turn != v_player_turn THEN
    RAISE EXCEPTION 'Não é seu turno';
  END IF;
  
  v_game_state := v_battle.game_state;
  v_current_turn_number := COALESCE((v_game_state->>'turn_number')::INT, 1);
  
  v_attacker_monster := v_game_state->v_attacker_field->'monster';
  v_defender_monster := v_game_state->v_defender_field->'monster';
  
  IF v_attacker_monster IS NULL OR v_attacker_monster = 'null'::jsonb THEN
    RAISE EXCEPTION 'Você não tem um monstro no campo';
  END IF;
  
  -- SUMMONING SICKNESS CHECK
  v_summoned_on_turn := COALESCE((v_attacker_monster->>'summoned_on_turn')::INT, 0);
  IF v_summoned_on_turn = v_current_turn_number THEN
    RAISE EXCEPTION 'Este monstro foi invocado neste turno e não pode atacar ainda (Summoning Sickness)';
  END IF;
  
  -- Check if already attacked this turn
  IF COALESCE((v_game_state->>'has_attacked_this_turn')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'Você já atacou neste turno';
  END IF;
  
  -- Check if attacker monster is FROZEN
  IF COALESCE((v_attacker_monster->>'is_frozen')::BOOLEAN, false) THEN
    v_attacker_monster := v_attacker_monster - 'is_frozen';
    v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_field, 'monster'], v_attacker_monster);
    
    v_game_state := jsonb_set(
      v_game_state,
      '{battle_log}',
      COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
      jsonb_build_object(
        'type', 'EFFECT_TRIGGERED',
        'action', 'FREEZE_PREVENTED_ATTACK',
        'monster', v_attacker_monster->>'name',
        'message', format('%s estava congelado e não pôde atacar! O gelo derreteu.', v_attacker_monster->>'name'),
        'logged_at', v_logged_at,
        'timestamp', NOW()
      )
    );
    
    v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
    
    UPDATE battles SET
      game_state = v_game_state,
      last_action_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object('success', true, 'game_state', v_game_state, 'frozen', true, 'message', 'Monstro estava congelado e não pôde atacar');
  END IF;
  
  v_damage := COALESCE((v_attacker_monster->>'atk')::INT, 0);
  
  IF v_defender_monster IS NOT NULL AND v_defender_monster != 'null'::jsonb THEN
    v_attack_type := 'ATTACK_MONSTER';
  ELSE
    v_attack_type := 'DIRECT_ATTACK';
  END IF;
  
  -- ===== ATTACKER MONSTER EFFECTS =====
  IF v_attacker_monster->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker_monster->'effects')
    LOOP
      v_effect_type := v_effect->>'type';
      v_effect_value := COALESCE((v_effect->>'value')::NUMERIC, 0);
      
      IF v_effect_type = 'BOOST' THEN
        IF v_effect_value < 10 THEN
          v_damage := v_damage + FLOOR(v_damage * (v_effect_value - 1))::INT;
        ELSE
          v_damage := v_damage + FLOOR(v_damage * v_effect_value / 100)::INT;
        END IF;
      ELSIF v_effect_type = 'DOUBLE' THEN
        v_boost_multiplier := 2.0;
      ELSIF v_effect_type = 'BURN' THEN
        IF v_effect_value < 10 THEN
          v_burn_damage := FLOOR(v_damage * v_effect_value)::INT;
        ELSE
          v_burn_damage := FLOOR(v_effect_value)::INT;
        END IF;
      ELSIF v_effect_type = 'HEAL' THEN
        IF v_effect_value < 10 THEN
          v_heal_amount := FLOOR(v_damage * v_effect_value)::INT;
        ELSE
          v_heal_amount := FLOOR(v_effect_value)::INT;
        END IF;
      ELSIF v_effect_type = 'FREEZE' THEN
        v_freeze_applied := true;
      END IF;
    END LOOP;
    
    IF v_boost_multiplier > 1.0 THEN
      v_damage := COALESCE((v_attacker_monster->>'atk')::INT, 0);
      FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker_monster->'effects')
      LOOP
        v_effect_type := v_effect->>'type';
        v_effect_value := COALESCE((v_effect->>'value')::NUMERIC, 0);
        IF v_effect_type = 'BOOST' THEN
          IF v_effect_value < 10 THEN
            v_damage := v_damage + FLOOR(v_damage * (v_effect_value - 1) * v_boost_multiplier)::INT;
          ELSE
            v_damage := v_damage + FLOOR(v_damage * v_effect_value / 100 * v_boost_multiplier)::INT;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  v_defender_traps := COALESCE((v_game_state->v_defender_field->'traps'), '[]'::jsonb);
  
  -- ===== DEFENDER TRAP EFFECTS =====
  IF jsonb_array_length(v_defender_traps) > 0 THEN
    v_trap := v_defender_traps->0;
    v_remaining_traps := v_defender_traps - 0;
    
    IF v_trap->'effects' IS NOT NULL THEN
      FOR v_effect IN SELECT * FROM jsonb_array_elements(v_trap->'effects')
      LOOP
        v_effect_type := v_effect->>'type';
        v_effect_value := COALESCE((v_effect->>'value')::NUMERIC, 0);
        
        IF v_effect_type = 'REFLECT' THEN
          IF v_effect_value < 1 THEN
            v_reflect_damage := FLOOR(v_damage * v_effect_value)::INT;
          ELSIF v_effect_value < 10 THEN
            v_reflect_damage := FLOOR(v_damage * v_effect_value)::INT;
          ELSE
            v_reflect_damage := FLOOR(v_damage * v_effect_value / 100)::INT;
          END IF;
          
          v_attacker_hp := COALESCE((v_game_state->>v_attacker_hp_key)::INT, 100);
          v_attacker_hp := v_attacker_hp - v_reflect_damage;
          v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_hp_key], to_jsonb(v_attacker_hp));
          
          v_damage := 0;
          v_trap_activated := true;
          v_trap_message := format('Armadilha %s ativada! Refletiu %s de dano e protegeu o monstro!', v_trap->>'name', v_reflect_damage);
          
        ELSIF v_effect_type = 'REDUCE' THEN
          IF v_effect_value < 1 THEN
            v_damage := FLOOR(v_damage * (1 - v_effect_value))::INT;
          ELSIF v_effect_value < 10 THEN
            v_damage := FLOOR(v_damage / v_effect_value)::INT;
          ELSE
            v_damage := FLOOR(v_damage * (100 - v_effect_value) / 100)::INT;
          END IF;
          v_trap_activated := true;
          v_trap_message := format('Armadilha %s ativada! Dano reduzido para %s!', v_trap->>'name', v_damage);
          
        ELSIF v_effect_type = 'NULLIFY' OR v_effect_type = 'SHIELD' THEN
          v_damage := 0;
          v_trap_activated := true;
          v_trap_message := format('Armadilha %s ativada! Ataque completamente bloqueado!', v_trap->>'name');
        
        ELSIF v_effect_type = 'BURN' THEN
          DECLARE
            v_trap_burn_damage INT;
          BEGIN
            IF v_effect_value < 10 THEN
              v_trap_burn_damage := FLOOR(v_damage * v_effect_value)::INT;
            ELSE
              v_trap_burn_damage := FLOOR(v_effect_value)::INT;
            END IF;
            
            v_attacker_hp := COALESCE((v_game_state->>v_attacker_hp_key)::INT, 100);
            v_attacker_hp := v_attacker_hp - v_trap_burn_damage;
            v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_hp_key], to_jsonb(v_attacker_hp));
            
            v_trap_activated := true;
            v_trap_message := format('Armadilha %s ativada! Queimou o atacante causando %s de dano!', v_trap->>'name', v_trap_burn_damage);
          END;
        
        ELSIF v_effect_type = 'HEAL' THEN
          DECLARE
            v_trap_heal_amount INT;
          BEGIN
            IF v_effect_value < 10 THEN
              v_trap_heal_amount := FLOOR(v_effect_value * 10)::INT;
            ELSE
              v_trap_heal_amount := FLOOR(v_effect_value)::INT;
            END IF;
            
            v_defender_hp := COALESCE((v_game_state->>v_defender_hp_key)::INT, 100);
            v_defender_hp := LEAST(100, v_defender_hp + v_trap_heal_amount);
            v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_hp_key], to_jsonb(v_defender_hp));
            
            v_trap_activated := true;
            v_trap_message := format('Armadilha %s ativada! Curou %s de HP!', v_trap->>'name', v_trap_heal_amount);
          END;
        
        ELSIF v_effect_type = 'BOOST' THEN
          v_game_state := jsonb_set(v_game_state, '{pending_trap_boost}', to_jsonb(v_effect_value));
          v_trap_activated := true;
          v_trap_message := format('Armadilha %s ativada! Seu próximo monstro receberá +%s%% de ATK!', v_trap->>'name', FLOOR(v_effect_value * 100)::INT);
        
        ELSIF v_effect_type = 'DOUBLE' THEN
          DECLARE
            v_double_damage INT;
          BEGIN
            v_double_damage := FLOOR(v_damage * 0.5)::INT;
            
            v_attacker_hp := COALESCE((v_game_state->>v_attacker_hp_key)::INT, 100);
            v_attacker_hp := v_attacker_hp - v_double_damage;
            v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_hp_key], to_jsonb(v_attacker_hp));
            
            v_trap_activated := true;
            v_trap_message := format('Armadilha %s ativada! Espelhou %s de dano de volta!', v_trap->>'name', v_double_damage);
          END;
        
        -- NEW: SWAP_STATS - Inverte ATK e HP do monstro atacante
        ELSIF v_effect_type = 'SWAP_STATS' THEN
          DECLARE
            v_old_atk INT;
            v_old_hp INT;
          BEGIN
            v_old_atk := COALESCE((v_attacker_monster->>'atk')::INT, 0);
            v_old_hp := COALESCE((v_attacker_monster->>'current_hp')::INT, (v_attacker_monster->>'def')::INT, 0);
            
            -- Inverte: ATK vira HP, HP vira ATK
            v_attacker_monster := jsonb_set(v_attacker_monster, '{atk}', to_jsonb(v_old_hp));
            v_attacker_monster := jsonb_set(v_attacker_monster, '{current_hp}', to_jsonb(v_old_atk));
            v_attacker_monster := jsonb_set(v_attacker_monster, '{def}', to_jsonb(v_old_atk));
            v_attacker_monster := jsonb_set(v_attacker_monster, '{max_hp}', to_jsonb(v_old_atk));
            v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_field, 'monster'], v_attacker_monster);
            
            -- Recalcula dano com novo ATK (que era o HP antigo)
            v_damage := v_old_hp;
            
            v_trap_activated := true;
            v_trap_message := format('Armadilha %s ativada! ATK e HP de %s foram invertidos! (ATK: %s→%s, HP: %s→%s)', v_trap->>'name', v_attacker_monster->>'name', v_old_atk, v_old_hp, v_old_hp, v_old_atk);
          END;
        
        -- NEW: DRAIN - Rouba HP do atacante e cura o defensor
        ELSIF v_effect_type = 'DRAIN' THEN
          DECLARE
            v_drain_amount INT;
          BEGIN
            IF v_effect_value < 10 THEN
              v_drain_amount := FLOOR(v_effect_value * 10)::INT;
            ELSE
              v_drain_amount := FLOOR(v_effect_value)::INT;
            END IF;
            
            -- Danifica HP do ATACANTE
            v_attacker_hp := COALESCE((v_game_state->>v_attacker_hp_key)::INT, 100);
            v_attacker_hp := GREATEST(0, v_attacker_hp - v_drain_amount);
            v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_hp_key], to_jsonb(v_attacker_hp));
            
            -- Cura HP do DEFENSOR
            v_defender_hp := COALESCE((v_game_state->>v_defender_hp_key)::INT, 100);
            v_defender_hp := LEAST(100, v_defender_hp + v_drain_amount);
            v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_hp_key], to_jsonb(v_defender_hp));
            
            v_trap_activated := true;
            v_trap_message := format('Armadilha %s ativada! Drenou %s HP do atacante!', v_trap->>'name', v_drain_amount);
          END;
        
        END IF;
      END LOOP;
    END IF;
    
    IF v_trap_activated THEN
      v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'traps'], v_remaining_traps);
      
      v_game_state := jsonb_set(
        v_game_state,
        '{battle_log}',
        COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
        jsonb_build_object(
          'type', 'TRAP_ACTIVATED',
          'action', 'TRAP_ACTIVATED',
          'trap', v_trap->>'name',
          'effect', v_effect_type,
          'message', v_trap_message,
          'logged_at', v_logged_at,
          'timestamp', NOW()
        )
      );
    END IF;
  END IF;
  
  -- Apply damage
  IF v_damage > 0 THEN
    IF v_defender_monster IS NOT NULL AND v_defender_monster != 'null'::jsonb THEN
      DECLARE
        v_monster_hp INT;
        v_max_hp INT;
      BEGIN
        v_monster_hp := COALESCE((v_defender_monster->>'current_hp')::INT, (v_defender_monster->>'def')::INT, 0);
        v_max_hp := COALESCE((v_defender_monster->>'max_hp')::INT, (v_defender_monster->>'def')::INT, 0);
        v_monster_hp := v_monster_hp - v_damage;
        
        IF v_monster_hp <= 0 THEN
          v_overflow := ABS(v_monster_hp);
          
          v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'monster'], 'null'::jsonb);
          
          v_game_state := jsonb_set(
            v_game_state,
            '{battle_log}',
            COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
            jsonb_build_object(
              'type', 'MONSTER_DESTROYED',
              'action', 'MONSTER_DESTROYED',
              'player', v_player_turn,
              'monster_name', v_defender_monster->>'name',
              'damage', v_damage,
              'logged_at', v_logged_at,
              'timestamp', NOW()
            )
          );
          
          IF v_overflow > 0 THEN
            v_defender_hp := COALESCE((v_game_state->>v_defender_hp_key)::INT, 100);
            v_defender_hp := GREATEST(0, v_defender_hp - v_overflow);
            v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_hp_key], to_jsonb(v_defender_hp));
            
            v_game_state := jsonb_set(
              v_game_state,
              '{battle_log}',
              COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
              jsonb_build_object(
                'type', 'OVERFLOW_DAMAGE',
                'action', 'OVERFLOW_DAMAGE',
                'damage', v_overflow,
                'target', CASE WHEN v_player_turn = 'PLAYER1' THEN 'player2' ELSE 'player1' END,
                'logged_at', v_logged_at,
                'timestamp', NOW()
              )
            );
          END IF;
        ELSE
          v_defender_monster := jsonb_set(v_defender_monster, '{current_hp}', to_jsonb(v_monster_hp));
          v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'monster'], v_defender_monster);
        END IF;
      END;
    ELSE
      v_defender_hp := COALESCE((v_game_state->>v_defender_hp_key)::INT, 100);
      v_defender_hp := v_defender_hp - v_damage;
      v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_hp_key], to_jsonb(v_defender_hp));
    END IF;
  END IF;
  
  -- Apply BURN damage from attacker monster effect
  IF v_burn_damage > 0 THEN
    v_defender_hp := COALESCE((v_game_state->>v_defender_hp_key)::INT, 100);
    v_defender_hp := GREATEST(0, v_defender_hp - v_burn_damage);
    v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_hp_key], to_jsonb(v_defender_hp));
    
    v_game_state := jsonb_set(
      v_game_state,
      '{battle_log}',
      COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
      jsonb_build_object(
        'type', 'EFFECT_TRIGGERED',
        'action', 'BURN_DAMAGE',
        'damage', v_burn_damage,
        'source', v_attacker_monster->>'name',
        'message', format('%s causou %s de dano de queimadura!', v_attacker_monster->>'name', v_burn_damage),
        'logged_at', v_logged_at,
        'timestamp', NOW()
      )
    );
  END IF;
  
  -- Apply HEAL to attacker from monster effect
  IF v_heal_amount > 0 THEN
    v_attacker_hp := COALESCE((v_game_state->>v_attacker_hp_key)::INT, 100);
    v_attacker_hp := LEAST(100, v_attacker_hp + v_heal_amount);
    v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_hp_key], to_jsonb(v_attacker_hp));
    
    v_game_state := jsonb_set(
      v_game_state,
      '{battle_log}',
      COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
      jsonb_build_object(
        'type', 'EFFECT_TRIGGERED',
        'action', 'HEAL_HP',
        'amount', v_heal_amount,
        'source', v_attacker_monster->>'name',
        'message', format('%s curou %s de HP!', v_attacker_monster->>'name', v_heal_amount),
        'logged_at', v_logged_at,
        'timestamp', NOW()
      )
    );
  END IF;
  
  -- Apply FREEZE to defender monster
  IF v_freeze_applied AND v_defender_monster IS NOT NULL AND v_defender_monster != 'null'::jsonb THEN
    v_defender_monster := v_game_state->v_defender_field->'monster';
    IF v_defender_monster IS NOT NULL AND v_defender_monster != 'null'::jsonb THEN
      v_defender_monster := jsonb_set(v_defender_monster, '{is_frozen}', 'true'::jsonb);
      v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'monster'], v_defender_monster);
      
      v_game_state := jsonb_set(
        v_game_state,
        '{battle_log}',
        COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
        jsonb_build_object(
          'type', 'EFFECT_TRIGGERED',
          'action', 'FREEZE_APPLIED',
          'target', v_defender_monster->>'name',
          'source', v_attacker_monster->>'name',
          'message', format('%s congelou %s! Ele não poderá atacar no próximo turno.', v_attacker_monster->>'name', v_defender_monster->>'name'),
          'logged_at', v_logged_at,
          'timestamp', NOW()
        )
      );
    END IF;
  END IF;
  
  v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
  
  -- Log attack
  v_game_state := jsonb_set(
    v_game_state,
    '{battle_log}',
    COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
    jsonb_build_object(
      'type', v_attack_type,
      'action', 'ATTACK',
      'attacker_player', v_player_turn,
      'player', v_player_turn,
      'attacker', v_attacker_monster->>'name',
      'defender', COALESCE(v_defender_monster->>'name', 'HP'),
      'damage', v_damage,
      'trap_activated', v_trap_activated,
      'trap_message', v_trap_message,
      'logged_at', v_logged_at,
      'timestamp', NOW()
    )
  );
  
  -- Check win conditions
  v_attacker_hp := COALESCE((v_game_state->>v_attacker_hp_key)::INT, 100);
  v_defender_hp := COALESCE((v_game_state->>v_defender_hp_key)::INT, 100);
  
  IF v_defender_hp <= 0 THEN
    v_winner_id := p_player_id;
    v_loser_id := CASE WHEN v_battle.player1_id = p_player_id THEN v_battle.player2_id ELSE v_battle.player1_id END;
  ELSIF v_attacker_hp <= 0 THEN
    v_winner_id := CASE WHEN v_battle.player1_id = p_player_id THEN v_battle.player2_id ELSE v_battle.player1_id END;
    v_loser_id := p_player_id;
  END IF;
  
  IF v_winner_id IS NOT NULL THEN
    -- Grant XP to winner (10 XP)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 10,
        level_xp = COALESCE(level_xp, 0) + 10
    WHERE id = v_winner_id;
    
    -- Grant XP to loser (3 XP)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 3,
        level_xp = COALESCE(level_xp, 0) + 3
    WHERE id = v_loser_id;
    
    -- Log weekly XP for winner
    v_week_start := get_week_start(CURRENT_DATE);
    INSERT INTO weekly_xp_log (user_id, school_id, week_start, xp_earned, source)
    SELECT v_winner_id, current_school_id, v_week_start, 10, 'battle_win'
    FROM profiles WHERE id = v_winner_id AND current_school_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    
    -- Log weekly XP for loser
    INSERT INTO weekly_xp_log (user_id, school_id, week_start, xp_earned, source)
    SELECT v_loser_id, current_school_id, v_week_start, 3, 'battle_loss'
    FROM profiles WHERE id = v_loser_id AND current_school_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    
    UPDATE battles SET
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = v_winner_id,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'game_state', v_game_state, 
      'battle_ended', true, 
      'winner_id', v_winner_id,
      'xp_awarded', jsonb_build_object('winner', 10, 'loser', 3)
    );
  END IF;
  
  UPDATE battles SET
    game_state = v_game_state,
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object('success', true, 'game_state', v_game_state, 'damage', v_damage, 'trap_activated', v_trap_activated, 'trap_message', v_trap_message);
END;
$$;
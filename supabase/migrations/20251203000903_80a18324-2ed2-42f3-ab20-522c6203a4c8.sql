-- Atualizar função attack para processar efeitos especiais de cartas
CREATE OR REPLACE FUNCTION public.attack(p_battle_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  v_attacker_atk INT;
  v_defender_atk INT;
  v_attacker_hp INT;
  v_defender_hp INT;
  v_player_hp INT;
  v_opponent_hp INT;
  v_attacker_destroyed BOOLEAN := FALSE;
  v_defender_destroyed BOOLEAN := FALSE;
  v_excess_damage INT := 0;
  v_battle_log JSONB;
  v_next_turn TEXT;
  v_opponent_hand_count INT;
  v_opponent_monster JSONB;
  v_loser_id UUID;
  -- Effect variables
  v_effect JSONB;
  v_boost_value INT := 0;
  v_shield_value INT := 0;
  v_reflect_pct INT := 0;
  v_reflected_damage INT := 0;
  v_burn_damage INT := 0;
  v_heal_value INT := 0;
  v_is_frozen BOOLEAN := FALSE;
  v_double_multiplier INT := 1;
  v_effect_log JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;

  IF p_player_id = v_battle.player1_id THEN
    v_player_number := 'PLAYER1';
    v_opponent_number := 'PLAYER2';
  ELSIF p_player_id = v_battle.player2_id THEN
    v_player_number := 'PLAYER2';
    v_opponent_number := 'PLAYER1';
  ELSE
    RAISE EXCEPTION 'Player not in this battle';
  END IF;

  IF v_battle.current_turn != v_player_number THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  v_game_state := v_battle.game_state;
  v_player_field := LOWER(v_player_number) || '_field';
  v_opponent_field := LOWER(v_opponent_number) || '_field';
  v_player_hp_key := LOWER(v_player_number) || '_hp';
  v_opponent_hp_key := LOWER(v_opponent_number) || '_hp';

  v_attacker := v_game_state->v_player_field->'monster';
  IF v_attacker IS NULL OR v_attacker = 'null'::jsonb THEN
    RAISE EXCEPTION 'No monster to attack with';
  END IF;

  v_defender := v_game_state->v_opponent_field->'monster';
  v_attacker_atk := (v_attacker->>'atk')::INT;

  -- ==========================================
  -- PROCESSAR EFEITOS DO ATACANTE
  -- ==========================================
  
  -- Verificar FREEZE no atacante (não pode atacar se congelado)
  IF v_attacker->'effects' IS NOT NULL AND jsonb_array_length(v_attacker->'effects') > 0 THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'FREEZE' THEN
        v_is_frozen := TRUE;
        -- Remover efeito FREEZE após ser usado (dura 1 turno)
        v_attacker := jsonb_set(
          v_attacker,
          '{effects}',
          (SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) FROM jsonb_array_elements(v_attacker->'effects') e WHERE e->>'type' != 'FREEZE')
        );
        v_game_state := jsonb_set(v_game_state, ARRAY[v_player_field, 'monster'], v_attacker);
      END IF;
    END LOOP;
  END IF;
  
  IF v_is_frozen THEN
    -- Log e passar turno
    v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
      jsonb_build_object(
        'action', 'FROZEN_SKIP',
        'player', v_player_number,
        'monster', v_attacker->>'name',
        'timestamp', NOW()
      );
    v_game_state := jsonb_set(v_game_state, '{battle_log}', v_battle_log);
    
    v_next_turn := CASE WHEN v_player_number = 'PLAYER1' THEN 'PLAYER2' ELSE 'PLAYER1' END;
    
    UPDATE battles 
    SET game_state = v_game_state,
        current_turn = v_next_turn,
        turn_started_at = NOW(),
        last_action_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object('success', true, 'game_state', v_game_state, 'next_turn', v_next_turn, 'frozen_skip', true);
  END IF;

  -- Processar DOUBLE (multiplica outros efeitos)
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'DOUBLE' THEN
        v_double_multiplier := 2;
        v_effect_log := v_effect_log || jsonb_build_object('effect', 'DOUBLE', 'applied', true);
      END IF;
    END LOOP;
  END IF;

  -- Processar BOOST do atacante (aumenta ATK)
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'BOOST' THEN
        v_boost_value := COALESCE((v_effect->>'value')::INT, 10) * v_double_multiplier;
        v_attacker_atk := v_attacker_atk + v_boost_value;
        v_effect_log := v_effect_log || jsonb_build_object('effect', 'BOOST', 'value', v_boost_value);
      END IF;
    END LOOP;
  END IF;

  -- ==========================================
  -- PROCESSAR EFEITOS DO DEFENSOR
  -- ==========================================
  
  IF v_defender IS NOT NULL AND v_defender != 'null'::jsonb AND v_defender->'effects' IS NOT NULL THEN
    -- Processar SHIELD (reduz dano recebido)
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_defender->'effects')
    LOOP
      IF v_effect->>'type' = 'SHIELD' THEN
        v_shield_value := COALESCE((v_effect->>'value')::INT, 5);
        v_attacker_atk := GREATEST(1, v_attacker_atk - v_shield_value);
        v_effect_log := v_effect_log || jsonb_build_object('effect', 'SHIELD', 'blocked', v_shield_value);
      END IF;
      
      -- Processar REFLECT (reflete % do dano)
      IF v_effect->>'type' = 'REFLECT' THEN
        v_reflect_pct := COALESCE((v_effect->>'value')::INT, 30);
        v_effect_log := v_effect_log || jsonb_build_object('effect', 'REFLECT', 'percent', v_reflect_pct);
      END IF;
    END LOOP;
  END IF;

  -- ==========================================
  -- COMBATE
  -- ==========================================

  IF v_defender IS NULL OR v_defender = 'null'::jsonb THEN
    -- Ataque direto ao HP do oponente
    v_opponent_hp := (v_game_state->>v_opponent_hp_key)::INT - v_attacker_atk;
    v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_hp_key], to_jsonb(v_opponent_hp));
    
    v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
      jsonb_build_object(
        'action', 'DIRECT_ATTACK',
        'player', v_player_number,
        'attacker', v_attacker->>'name',
        'damage', v_attacker_atk,
        'target_hp', v_opponent_hp,
        'effects_applied', v_effect_log,
        'timestamp', NOW()
      );
  ELSE
    -- SISTEMA HEARTHSTONE: Combate simultâneo
    v_defender_atk := (v_defender->>'atk')::INT;
    v_attacker_hp := COALESCE((v_attacker->>'current_hp')::INT, (v_attacker->>'def')::INT);
    v_defender_hp := COALESCE((v_defender->>'current_hp')::INT, (v_defender->>'def')::INT);
    
    -- Aplicar dano (ATK vs HP)
    v_attacker_hp := v_attacker_hp - v_defender_atk;
    v_defender_hp := v_defender_hp - v_attacker_atk;
    
    -- Aplicar REFLECT (dano refletido ao atacante)
    IF v_reflect_pct > 0 THEN
      v_reflected_damage := (v_attacker_atk * v_reflect_pct) / 100;
      v_attacker_hp := v_attacker_hp - v_reflected_damage;
    END IF;
    
    -- Verificar destruições
    v_attacker_destroyed := v_attacker_hp <= 0;
    v_defender_destroyed := v_defender_hp <= 0;
    
    -- Calcular dano excedente se defender foi destruído
    IF v_defender_destroyed AND v_defender_hp < 0 THEN
      v_excess_damage := ABS(v_defender_hp);
    END IF;
    
    -- Atualizar HP do atacante ou destruir
    IF v_attacker_destroyed THEN
      v_game_state := jsonb_set(v_game_state, ARRAY[v_player_field, 'monster'], 'null'::jsonb);
    ELSE
      v_game_state := jsonb_set(
        v_game_state, 
        ARRAY[v_player_field, 'monster', 'current_hp'], 
        to_jsonb(v_attacker_hp)
      );
    END IF;
    
    -- Atualizar HP do defensor ou destruir
    IF v_defender_destroyed THEN
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_field, 'monster'], 'null'::jsonb);
      
      -- Dano excedente vai para o HP do oponente
      IF v_excess_damage > 0 THEN
        v_opponent_hp := (v_game_state->>v_opponent_hp_key)::INT - v_excess_damage;
        v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_hp_key], to_jsonb(v_opponent_hp));
      END IF;
    ELSE
      v_game_state := jsonb_set(
        v_game_state, 
        ARRAY[v_opponent_field, 'monster', 'current_hp'], 
        to_jsonb(v_defender_hp)
      );
    END IF;
    
    -- Log de batalha detalhado
    v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
      jsonb_build_object(
        'action', 'MONSTER_BATTLE',
        'player', v_player_number,
        'attacker', v_attacker->>'name',
        'attacker_atk', v_attacker_atk,
        'attacker_hp_remaining', CASE WHEN v_attacker_destroyed THEN 0 ELSE v_attacker_hp END,
        'attacker_destroyed', v_attacker_destroyed,
        'defender', v_defender->>'name',
        'defender_atk', v_defender_atk,
        'defender_hp_remaining', CASE WHEN v_defender_destroyed THEN 0 ELSE v_defender_hp END,
        'defender_destroyed', v_defender_destroyed,
        'excess_damage', v_excess_damage,
        'reflected_damage', v_reflected_damage,
        'effects_applied', v_effect_log,
        'timestamp', NOW()
      );
  END IF;
  
  v_game_state := jsonb_set(v_game_state, '{battle_log}', v_battle_log);

  -- ==========================================
  -- PROCESSAR EFEITOS DE FIM DE TURNO
  -- ==========================================
  
  -- BURN: Aplicar dano ao monstro oponente
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'BURN' THEN
        v_burn_damage := COALESCE((v_effect->>'value')::INT, 5) * v_double_multiplier;
        
        -- Aplicar BURN ao monstro oponente se existir
        IF v_game_state->v_opponent_field->'monster' IS NOT NULL AND v_game_state->v_opponent_field->'monster' != 'null'::jsonb THEN
          v_defender_hp := COALESCE((v_game_state->v_opponent_field->'monster'->>'current_hp')::INT, (v_game_state->v_opponent_field->'monster'->>'def')::INT);
          v_defender_hp := v_defender_hp - v_burn_damage;
          
          IF v_defender_hp <= 0 THEN
            v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_field, 'monster'], 'null'::jsonb);
          ELSE
            v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_field, 'monster', 'current_hp'], to_jsonb(v_defender_hp));
          END IF;
          
          v_game_state := jsonb_set(
            v_game_state,
            '{battle_log}',
            COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
            jsonb_build_object('action', 'BURN_DAMAGE', 'target', v_game_state->v_opponent_field->'monster'->>'name', 'damage', v_burn_damage, 'timestamp', NOW())
          );
        END IF;
      END IF;
      
      -- HEAL: Restaurar HP do próprio monstro
      IF v_effect->>'type' = 'HEAL' THEN
        v_heal_value := COALESCE((v_effect->>'value')::INT, 5) * v_double_multiplier;
        
        IF v_game_state->v_player_field->'monster' IS NOT NULL AND v_game_state->v_player_field->'monster' != 'null'::jsonb THEN
          v_attacker_hp := COALESCE((v_game_state->v_player_field->'monster'->>'current_hp')::INT, (v_game_state->v_player_field->'monster'->>'def')::INT);
          v_attacker_hp := LEAST(v_attacker_hp + v_heal_value, (v_game_state->v_player_field->'monster'->>'max_hp')::INT);
          v_game_state := jsonb_set(v_game_state, ARRAY[v_player_field, 'monster', 'current_hp'], to_jsonb(v_attacker_hp));
          
          v_game_state := jsonb_set(
            v_game_state,
            '{battle_log}',
            COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
            jsonb_build_object('action', 'HEAL', 'target', v_game_state->v_player_field->'monster'->>'name', 'value', v_heal_value, 'timestamp', NOW())
          );
        END IF;
      END IF;
      
      -- FREEZE: Aplicar congelamento ao monstro oponente
      IF v_effect->>'type' = 'FREEZE' THEN
        IF v_game_state->v_opponent_field->'monster' IS NOT NULL AND v_game_state->v_opponent_field->'monster' != 'null'::jsonb THEN
          -- Adicionar efeito FREEZE ao monstro oponente
          v_game_state := jsonb_set(
            v_game_state,
            ARRAY[v_opponent_field, 'monster', 'effects'],
            COALESCE(v_game_state->v_opponent_field->'monster'->'effects', '[]'::jsonb) || 
            jsonb_build_object('type', 'FREEZE', 'value', 1)
          );
          
          v_game_state := jsonb_set(
            v_game_state,
            '{battle_log}',
            COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
            jsonb_build_object('action', 'FREEZE_APPLIED', 'target', v_game_state->v_opponent_field->'monster'->>'name', 'timestamp', NOW())
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- Trocar turno
  v_next_turn := CASE WHEN v_player_number = 'PLAYER1' THEN 'PLAYER2' ELSE 'PLAYER1' END;

  -- Verificar vitória por HP
  v_player_hp := (v_game_state->>v_player_hp_key)::INT;
  v_opponent_hp := COALESCE((v_game_state->>v_opponent_hp_key)::INT, 100);
  
  -- VITÓRIA: Oponente com HP <= 0
  IF v_opponent_hp <= 0 THEN
    v_loser_id := CASE WHEN p_player_id = v_battle.player1_id THEN v_battle.player2_id ELSE v_battle.player1_id END;
    
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 50 WHERE id = p_player_id;
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 10 WHERE id = v_loser_id;
    
    UPDATE battles 
    SET game_state = v_game_state,
        status = 'FINISHED',
        winner_id = p_player_id,
        finished_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'game_state', v_game_state, 
      'battle_ended', true, 
      'winner', v_player_number,
      'victory_type', 'HP_ZERO',
      'xp_awarded', jsonb_build_object('winner', 50, 'loser', 10)
    );
  ELSIF v_player_hp <= 0 THEN
    v_loser_id := p_player_id;
    
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 50 
    WHERE id = CASE WHEN v_player_number = 'PLAYER1' THEN v_battle.player2_id ELSE v_battle.player1_id END;
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 10 WHERE id = p_player_id;
    
    UPDATE battles 
    SET game_state = v_game_state,
        status = 'FINISHED',
        winner_id = CASE WHEN v_player_number = 'PLAYER1' THEN v_battle.player2_id ELSE v_battle.player1_id END,
        finished_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'game_state', v_game_state, 
      'battle_ended', true, 
      'winner', v_opponent_number,
      'victory_type', 'HP_ZERO',
      'xp_awarded', jsonb_build_object('winner', 50, 'loser', 10)
    );
  END IF;

  -- Verificar vitória por deck-out
  v_opponent_hand_count := COALESCE(jsonb_array_length(v_game_state->(LOWER(v_opponent_number) || '_hand')), 0);
  v_opponent_monster := v_game_state->v_opponent_field->'monster';
  
  IF v_opponent_hand_count = 0 AND (v_opponent_monster IS NULL OR v_opponent_monster = 'null'::jsonb) THEN
    v_loser_id := CASE WHEN p_player_id = v_battle.player1_id THEN v_battle.player2_id ELSE v_battle.player1_id END;
    
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 50 WHERE id = p_player_id;
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 10 WHERE id = v_loser_id;
    
    v_game_state := jsonb_set(
      v_game_state, 
      '{battle_log}', 
      COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
      jsonb_build_object(
        'action', 'DECK_OUT_VICTORY',
        'player', v_player_number,
        'reason', 'Oponente sem cartas na mão e no campo',
        'timestamp', NOW()
      )
    );
    
    UPDATE battles 
    SET game_state = v_game_state,
        status = 'FINISHED',
        winner_id = p_player_id,
        finished_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'game_state', v_game_state, 
      'battle_ended', true, 
      'winner', v_player_number,
      'victory_type', 'DECK_OUT',
      'xp_awarded', jsonb_build_object('winner', 50, 'loser', 10)
    );
  END IF;

  -- Batalha continua
  UPDATE battles 
  SET game_state = v_game_state,
      current_turn = v_next_turn,
      turn_started_at = NOW(),
      last_action_at = NOW()
  WHERE id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'game_state', v_game_state, 'next_turn', v_next_turn);
END;
$function$;
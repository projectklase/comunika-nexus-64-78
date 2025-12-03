-- Atualizar função attack para suportar valores decimais nos efeitos
CREATE OR REPLACE FUNCTION public.attack(p_battle_id UUID, p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  -- Buscar batalha
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em andamento');
  END IF;
  
  -- Verificar turno
  IF v_battle.current_turn != p_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
  END IF;
  
  v_game_state := v_battle.game_state;
  
  -- Determinar jogador e oponente
  IF v_battle.player1_id = p_player_id THEN
    v_player_key := 'player1';
    v_opponent_key := 'player2';
  ELSE
    v_player_key := 'player2';
    v_opponent_key := 'player1';
  END IF;
  
  -- Obter monstros em campo
  v_attacker := v_game_state->v_player_key->'field'->'monster';
  v_defender := v_game_state->v_opponent_key->'field'->'monster';
  
  IF v_attacker IS NULL OR v_attacker = 'null'::jsonb THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não tem monstro em campo');
  END IF;
  
  -- Inicializar log de batalha
  v_battle_log := COALESCE(v_game_state->'battleLog', '[]'::jsonb);
  
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
  
  -- Se congelado, pular turno e remover FREEZE
  IF v_is_frozen THEN
    -- Remover efeito FREEZE do atacante
    v_attacker := jsonb_set(
      v_attacker,
      '{effects}',
      COALESCE(
        (SELECT jsonb_agg(e) FROM jsonb_array_elements(v_attacker->'effects') e WHERE e->>'type' != 'FREEZE'),
        '[]'::jsonb
      )
    );
    
    v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key, 'field', 'monster'], v_attacker);
    
    -- Log: congelado
    v_log_entry := jsonb_build_object(
      'type', 'FROZEN_SKIP',
      'attacker', v_attacker->>'name',
      'message', (v_attacker->>'name') || ' está congelado e não pode atacar!'
    );
    v_battle_log := v_battle_log || v_log_entry;
    v_game_state := jsonb_set(v_game_state, '{battleLog}', v_battle_log);
    
    -- Passar turno
    UPDATE battles SET
      game_state = v_game_state,
      current_turn = CASE WHEN player1_id = p_player_id THEN player2_id ELSE player1_id END,
      turn_started_at = NOW(),
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
  v_attacker_hp := COALESCE((v_attacker->>'currentHp')::INT, (v_attacker->>'def')::INT, 0);
  
  -- Verificar se há DOUBLE (dobra valores dos outros efeitos)
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      IF v_effect->>'type' = 'DOUBLE' THEN
        v_has_double := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Processar efeitos do ATACANTE
  IF v_attacker->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker->'effects')
    LOOP
      -- BOOST: aumenta ATK
      IF v_effect->>'type' = 'BOOST' THEN
        v_boost_value := COALESCE((v_effect->>'value')::NUMERIC, 1.0);
        
        -- Se value > 10, é valor absoluto (ex: +20 ATK)
        IF v_boost_value > 10 THEN
          v_attacker_atk := v_attacker_atk + v_boost_value::INT;
          IF v_has_double THEN
            v_attacker_atk := v_attacker_atk + v_boost_value::INT;
          END IF;
        ELSE
          -- É multiplicador (ex: 1.3 = +30%)
          IF v_has_double THEN
            -- Com DOUBLE, aplica o multiplicador duas vezes
            v_attacker_atk := FLOOR(v_attacker_atk * v_boost_value * v_boost_value)::INT;
          ELSE
            v_attacker_atk := FLOOR(v_attacker_atk * v_boost_value)::INT;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- Processar efeitos do DEFENSOR
  IF v_defender IS NOT NULL AND v_defender != 'null'::jsonb AND v_defender->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_defender->'effects')
    LOOP
      -- SHIELD: reduz dano recebido
      IF v_effect->>'type' = 'SHIELD' THEN
        v_shield_value := COALESCE((v_effect->>'value')::INT, 0);
        IF v_has_double THEN
          v_shield_value := v_shield_value * 2;
        END IF;
      END IF;
      
      -- REFLECT: reflete parte do dano
      IF v_effect->>'type' = 'REFLECT' THEN
        v_reflect_pct := COALESCE((v_effect->>'value')::NUMERIC, 0);
      END IF;
    END LOOP;
  END IF;
  
  -- Calcular dano após SHIELD
  v_damage := GREATEST(0, v_attacker_atk - v_shield_value);
  
  -- Calcular dano refletido por REFLECT
  IF v_reflect_pct > 0 THEN
    -- Se value < 1, é percentual decimal (0.5 = 50%)
    IF v_reflect_pct < 1 THEN
      v_reflected_damage := FLOOR(v_damage * v_reflect_pct)::INT;
    ELSE
      -- É percentual inteiro (50 = 50%)
      v_reflected_damage := FLOOR(v_damage * v_reflect_pct / 100)::INT;
    END IF;
  END IF;
  
  -- Obter HPs dos jogadores
  v_opponent_hp := COALESCE((v_game_state->v_opponent_key->>'hp')::INT, 100);
  v_my_hp := COALESCE((v_game_state->v_player_key->>'hp')::INT, 100);
  
  -- Se há defensor, aplicar dano ao defensor primeiro
  IF v_defender IS NOT NULL AND v_defender != 'null'::jsonb THEN
    v_defender_hp := COALESCE((v_defender->>'currentHp')::INT, (v_defender->>'def')::INT, 0);
    v_defender_hp := v_defender_hp - v_damage;
    
    -- Log: ataque ao monstro
    v_log_entry := jsonb_build_object(
      'type', 'ATTACK_MONSTER',
      'attacker', v_attacker->>'name',
      'defender', v_defender->>'name',
      'damage', v_damage,
      'remainingHp', GREATEST(0, v_defender_hp)
    );
    v_battle_log := v_battle_log || v_log_entry;
    
    IF v_defender_hp <= 0 THEN
      -- Monstro defensor destruído
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key, 'field', 'monster'], 'null'::jsonb);
      
      -- Dano excedente vai pro jogador
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
      -- Atualizar HP do defensor
      v_defender := jsonb_set(v_defender, '{currentHp}', to_jsonb(v_defender_hp));
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key, 'field', 'monster'], v_defender);
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
      -- BURN: causa dano ao oponente
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
      
      -- HEAL: restaura HP do meu monstro
      IF v_effect->>'type' = 'HEAL' THEN
        v_heal_value := COALESCE((v_effect->>'value')::INT, 5);
        IF v_has_double THEN
          v_heal_value := v_heal_value * 2;
        END IF;
        v_attacker_hp := v_attacker_hp + v_heal_value;
        v_attacker := jsonb_set(v_attacker, '{currentHp}', to_jsonb(v_attacker_hp));
        v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key, 'field', 'monster'], v_attacker);
        
        v_log_entry := jsonb_build_object(
          'type', 'HEAL',
          'value', v_heal_value,
          'monster', v_attacker->>'name'
        );
        v_battle_log := v_battle_log || v_log_entry;
      END IF;
      
      -- FREEZE: congela o monstro oponente
      IF v_effect->>'type' = 'FREEZE' AND NOT v_freeze_applied THEN
        IF v_defender IS NOT NULL AND v_defender != 'null'::jsonb THEN
          v_defender := jsonb_set(
            v_defender,
            '{effects}',
            COALESCE(v_defender->'effects', '[]'::jsonb) || jsonb_build_object('type', 'FREEZE', 'value', 1)
          );
          v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key, 'field', 'monster'], v_defender);
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
  v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key, 'hp'], to_jsonb(GREATEST(0, v_opponent_hp)));
  v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key, 'hp'], to_jsonb(GREATEST(0, v_my_hp)));
  v_game_state := jsonb_set(v_game_state, '{battleLog}', v_battle_log);
  
  -- Verificar vitória
  IF v_opponent_hp <= 0 THEN
    UPDATE battles SET
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = p_player_id,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    -- Dar XP ao vencedor
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 100 WHERE id = p_player_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'victory', true,
      'winner', p_player_id,
      'game_state', v_game_state
    );
  END IF;
  
  -- Verificar derrota (dano refletido matou atacante)
  IF v_my_hp <= 0 THEN
    UPDATE battles SET
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = CASE WHEN player1_id = p_player_id THEN player2_id ELSE player1_id END,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'victory', false,
      'winner', CASE WHEN v_battle.player1_id = p_player_id THEN v_battle.player2_id ELSE v_battle.player1_id END,
      'game_state', v_game_state
    );
  END IF;
  
  -- Passar turno
  UPDATE battles SET
    game_state = v_game_state,
    current_turn = CASE WHEN player1_id = p_player_id THEN player2_id ELSE player1_id END,
    turn_started_at = NOW(),
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'damage', v_damage,
    'reflected', v_reflected_damage,
    'game_state', v_game_state
  );
END;
$$;
-- Adicionar campo level_xp para XP permanente de nível
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS level_xp INTEGER DEFAULT 0;

-- Migrar dados existentes: level_xp = total_xp atual
UPDATE public.profiles 
SET level_xp = COALESCE(total_xp, 0)
WHERE level_xp IS NULL OR level_xp = 0;

-- Atualizar execute_battle_turn para incrementar ambos os campos
CREATE OR REPLACE FUNCTION public.execute_battle_turn(
  p_battle_id UUID,
  p_player_id UUID,
  p_action TEXT,
  p_card_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_battle battles%ROWTYPE;
  v_game_state JSONB;
  v_current_turn TEXT;
  v_player_key TEXT;
  v_opponent_key TEXT;
  v_opponent_id UUID;
  v_result JSONB;
  v_action_log JSONB;
  v_winner_id UUID;
  v_is_player1 BOOLEAN;
  v_played_card JSONB;
  v_damage INTEGER;
  v_damage_result JSONB;
  v_attacker_stats JSONB;
  v_defender_stats JSONB;
  v_attacker_card JSONB;
  v_defender_card JSONB;
  v_is_counter_attack BOOLEAN := FALSE;
  v_player_field JSONB;
  v_opponent_field JSONB;
  v_player_hp INTEGER;
  v_opponent_hp INTEGER;
  v_card_index INTEGER;
  v_player_hand JSONB;
  v_updated_hand JSONB;
  v_first_occurrence INTEGER := -1;
  v_i INTEGER;
BEGIN
  -- Buscar batalha e validar
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em progresso');
  END IF;
  
  -- Determinar se é player1 ou player2
  v_is_player1 := (p_player_id = v_battle.player1_id);
  
  IF NOT v_is_player1 AND p_player_id != v_battle.player2_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não é participante desta batalha');
  END IF;
  
  v_game_state := v_battle.game_state;
  v_current_turn := v_game_state->>'current_turn';
  
  -- Validar turno
  IF v_current_turn IS NOT NULL AND v_current_turn != p_player_id::TEXT THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
  END IF;
  
  -- Definir chaves
  IF v_is_player1 THEN
    v_player_key := 'player1';
    v_opponent_key := 'player2';
    v_opponent_id := v_battle.player2_id;
  ELSE
    v_player_key := 'player2';
    v_opponent_key := 'player1';
    v_opponent_id := v_battle.player1_id;
  END IF;
  
  v_player_field := v_game_state->(v_player_key || '_field');
  v_opponent_field := v_game_state->(v_opponent_key || '_field');
  v_player_hp := (v_game_state->(v_player_key || '_hp'))::INTEGER;
  v_opponent_hp := (v_game_state->(v_opponent_key || '_hp'))::INTEGER;
  v_player_hand := v_game_state->(v_player_key || '_hand');
  
  -- Processar ação
  CASE p_action
    WHEN 'PLAY_CARD' THEN
      IF p_card_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Card ID necessário');
      END IF;
      
      -- Encontrar APENAS a primeira ocorrência da carta na mão
      v_first_occurrence := -1;
      FOR v_i IN 0..jsonb_array_length(v_player_hand) - 1 LOOP
        IF (v_player_hand->v_i->>'id')::UUID = p_card_id THEN
          v_first_occurrence := v_i;
          EXIT; -- Sair do loop após encontrar a primeira
        END IF;
      END LOOP;
      
      IF v_first_occurrence = -1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Carta não encontrada na mão');
      END IF;
      
      -- Pegar a carta que será jogada
      v_played_card := v_player_hand->v_first_occurrence;
      
      -- Remover APENAS essa ocorrência específica da mão
      v_updated_hand := '[]'::JSONB;
      FOR v_i IN 0..jsonb_array_length(v_player_hand) - 1 LOOP
        IF v_i != v_first_occurrence THEN
          v_updated_hand := v_updated_hand || jsonb_build_array(v_player_hand->v_i);
        END IF;
      END LOOP;
      
      -- Atualizar mão do jogador
      v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hand'], v_updated_hand);
      
      -- Colocar carta no campo
      v_player_field := jsonb_set(COALESCE(v_player_field, '{"monster": null, "traps": []}'::JSONB), '{monster}', v_played_card);
      v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_field'], v_player_field);
      
      v_action_log := jsonb_build_object(
        'action', 'PLAY_CARD',
        'player', p_player_id,
        'card', v_played_card,
        'timestamp', now()
      );
      
    WHEN 'ATTACK' THEN
      -- Validar que há monstro no campo do jogador
      IF v_player_field->'monster' IS NULL OR v_player_field->>'monster' = 'null' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você não tem monstro no campo');
      END IF;
      
      v_attacker_card := v_player_field->'monster';
      v_defender_card := v_opponent_field->'monster';
      
      -- Calcular dano com efeitos
      v_damage_result := calculate_damage_and_apply_effects(
        v_attacker_card,
        v_defender_card,
        v_player_hp,
        v_opponent_hp
      );
      
      v_damage := (v_damage_result->>'damage')::INTEGER;
      v_attacker_stats := v_damage_result->'attacker_stats';
      v_defender_stats := v_damage_result->'defender_stats';
      v_is_counter_attack := COALESCE((v_damage_result->>'is_counter_attack')::BOOLEAN, FALSE);
      
      -- Aplicar HP do efeito de cura/dano ao atacante
      IF v_damage_result->'attacker_hp_change' IS NOT NULL THEN
        v_player_hp := GREATEST(0, v_player_hp + (v_damage_result->>'attacker_hp_change')::INTEGER);
      END IF;
      
      -- Aplicar dano
      IF v_is_counter_attack THEN
        -- Contra-ataque: atacante recebe dano
        v_player_hp := GREATEST(0, v_player_hp - v_damage);
      ELSE
        -- Ataque normal: oponente recebe dano
        v_opponent_hp := GREATEST(0, v_opponent_hp - v_damage);
      END IF;
      
      -- Atualizar HPs
      v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hp'], to_jsonb(v_player_hp));
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
      
      v_action_log := jsonb_build_object(
        'action', 'ATTACK',
        'player', p_player_id,
        'attacker', v_attacker_card,
        'defender', v_defender_card,
        'damage', v_damage,
        'attacker_stats', v_attacker_stats,
        'defender_stats', v_defender_stats,
        'effects_applied', v_damage_result->'effects_applied',
        'is_counter_attack', v_is_counter_attack,
        'player_hp_after', v_player_hp,
        'opponent_hp_after', v_opponent_hp,
        'timestamp', now()
      );
      
    WHEN 'END_TURN' THEN
      v_action_log := jsonb_build_object(
        'action', 'END_TURN',
        'player', p_player_id,
        'timestamp', now()
      );
      
    WHEN 'SURRENDER' THEN
      v_winner_id := v_opponent_id;
      
      UPDATE battles
      SET status = 'FINISHED',
          winner_id = v_winner_id,
          finished_at = now(),
          game_state = jsonb_set(v_game_state, '{battle_log}', 
            COALESCE(v_game_state->'battle_log', '[]'::JSONB) || 
            jsonb_build_array(jsonb_build_object(
              'action', 'SURRENDER',
              'player', p_player_id,
              'winner', v_winner_id,
              'timestamp', now()
            ))
          )
      WHERE id = p_battle_id;
      
      -- Dar XP ao vencedor (atualiza AMBOS os campos)
      UPDATE profiles 
      SET total_xp = COALESCE(total_xp, 0) + 50,
          level_xp = COALESCE(level_xp, 0) + 50
      WHERE id = v_winner_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'battle_ended', true,
        'winner_id', v_winner_id,
        'reason', 'surrender'
      );
      
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Ação inválida');
  END CASE;
  
  -- Verificar vitória por HP
  IF v_opponent_hp <= 0 THEN
    v_winner_id := p_player_id;
  ELSIF v_player_hp <= 0 THEN
    v_winner_id := v_opponent_id;
  END IF;
  
  -- Adicionar log
  v_game_state := jsonb_set(
    v_game_state, 
    '{battle_log}', 
    COALESCE(v_game_state->'battle_log', '[]'::JSONB) || jsonb_build_array(v_action_log)
  );
  
  -- Alternar turno se não houver vencedor
  IF v_winner_id IS NULL AND p_action IN ('END_TURN', 'ATTACK', 'PLAY_CARD') THEN
    v_game_state := jsonb_set(v_game_state, '{current_turn}', to_jsonb(v_opponent_id::TEXT));
  END IF;
  
  -- Atualizar batalha
  IF v_winner_id IS NOT NULL THEN
    UPDATE battles
    SET status = 'FINISHED',
        winner_id = v_winner_id,
        finished_at = now(),
        game_state = v_game_state,
        last_action_at = now()
    WHERE id = p_battle_id;
    
    -- Dar XP ao vencedor (atualiza AMBOS os campos)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 100,
        level_xp = COALESCE(level_xp, 0) + 100
    WHERE id = v_winner_id;
    
    -- Dar XP de consolação ao perdedor (atualiza AMBOS os campos)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 25,
        level_xp = COALESCE(level_xp, 0) + 25
    WHERE id = CASE WHEN v_winner_id = v_battle.player1_id THEN v_battle.player2_id ELSE v_battle.player1_id END;
  ELSE
    UPDATE battles
    SET game_state = v_game_state,
        last_action_at = now(),
        turn_started_at = CASE WHEN p_action = 'END_TURN' THEN now() ELSE turn_started_at END
    WHERE id = p_battle_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'game_state', v_game_state,
    'action_log', v_action_log,
    'battle_ended', v_winner_id IS NOT NULL,
    'winner_id', v_winner_id
  );
END;
$$;

-- Atualizar complete_challenge_and_reward para incrementar ambos os campos
CREATE OR REPLACE FUNCTION public.complete_challenge_and_reward(
  p_student_id UUID,
  p_challenge_id UUID,
  p_koin_reward INTEGER,
  p_xp_reward INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_school_id UUID;
  v_current_balance INTEGER;
BEGIN
  -- Obter school_id do aluno
  SELECT current_school_id INTO v_school_id
  FROM profiles
  WHERE id = p_student_id;

  -- Obter saldo atual
  SELECT koins INTO v_current_balance
  FROM profiles
  WHERE id = p_student_id;

  -- Atualizar status do desafio
  UPDATE student_challenges
  SET status = 'COMPLETED',
      completed_at = now(),
      updated_at = now()
  WHERE student_id = p_student_id
    AND challenge_id = p_challenge_id;

  -- Atualizar saldo do aluno e XP (ambos os campos de XP)
  UPDATE profiles
  SET koins = koins + p_koin_reward,
      total_xp = COALESCE(total_xp, 0) + p_xp_reward,
      level_xp = COALESCE(level_xp, 0) + p_xp_reward
  WHERE id = p_student_id;

  -- Registrar transação de Koins
  INSERT INTO koin_transactions (
    user_id,
    type,
    amount,
    description,
    related_entity_id,
    balance_before,
    balance_after,
    school_id
  ) VALUES (
    p_student_id,
    'CHALLENGE_REWARD',
    p_koin_reward,
    'Recompensa por completar desafio',
    p_challenge_id,
    v_current_balance,
    v_current_balance + p_koin_reward,
    v_school_id
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao completar desafio: %', SQLERRM;
    RETURN FALSE;
END;
$$;
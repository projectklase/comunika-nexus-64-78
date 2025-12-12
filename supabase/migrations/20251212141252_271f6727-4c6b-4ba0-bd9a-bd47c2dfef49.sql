
-- Atualizar função attack() para conceder XP ao vencedor e perdedor
CREATE OR REPLACE FUNCTION public.attack(p_battle_id uuid, p_player_id uuid, p_target_type text DEFAULT 'MONSTER')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_player_field TEXT;
  v_opponent_field TEXT;
  v_player_turn TEXT;
  v_attacker JSONB;
  v_target JSONB;
  v_damage INT;
  v_opponent_hp INT;
  v_opponent_hp_key TEXT;
  v_opponent_id UUID;
  v_winner_id UUID;
  v_current_turn_number INT;
  v_attacker_summoned_turn INT;
  v_has_attacked_this_turn BOOLEAN;
  v_winner_school_id UUID;
  v_loser_school_id UUID;
  v_week_start DATE;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em andamento');
  END IF;
  
  IF v_battle.player1_id = p_player_id THEN
    v_player_field := 'player1_field';
    v_opponent_field := 'player2_field';
    v_player_turn := 'PLAYER1';
    v_opponent_hp_key := 'player2_hp';
    v_opponent_id := v_battle.player2_id;
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_field := 'player2_field';
    v_opponent_field := 'player1_field';
    v_player_turn := 'PLAYER2';
    v_opponent_hp_key := 'player1_hp';
    v_opponent_id := v_battle.player1_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Você não está nesta batalha');
  END IF;
  
  IF v_battle.current_turn != v_player_turn THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
  END IF;
  
  v_game_state := v_battle.game_state;
  v_current_turn_number := COALESCE((v_game_state->>'turn_number')::INT, 1);
  v_has_attacked_this_turn := COALESCE((v_game_state->>'has_attacked_this_turn')::BOOLEAN, false);
  
  -- Check if already attacked this turn
  IF v_has_attacked_this_turn THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já atacou neste turno');
  END IF;
  
  v_attacker := v_game_state->v_player_field->'monster';
  
  IF v_attacker IS NULL OR v_attacker = 'null'::jsonb THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não tem um monstro para atacar');
  END IF;
  
  -- SUMMONING SICKNESS CHECK
  v_attacker_summoned_turn := COALESCE((v_attacker->>'summoned_on_turn')::INT, 0);
  IF v_attacker_summoned_turn = v_current_turn_number THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este monstro acabou de ser invocado e não pode atacar neste turno');
  END IF;
  
  v_target := v_game_state->v_opponent_field->'monster';
  
  IF p_target_type = 'MONSTER' THEN
    IF v_target IS NULL OR v_target = 'null'::jsonb THEN
      -- Direct attack to opponent HP
      v_damage := COALESCE((v_attacker->>'atk')::INT, 0);
      
      -- Apply effects and calculate final damage
      SELECT * INTO v_damage, v_game_state 
      FROM calculate_damage_and_apply_effects(v_game_state, v_attacker, NULL, v_damage, v_player_field, v_opponent_field);
      
      v_opponent_hp := COALESCE((v_game_state->>v_opponent_hp_key)::INT, 100) - v_damage;
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_hp_key], to_jsonb(v_opponent_hp));
      
      -- Log direct attack
      v_game_state := jsonb_set(
        v_game_state,
        '{battle_log}',
        COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
        jsonb_build_object(
          'action', 'DIRECT_ATTACK',
          'player', v_player_turn,
          'attacker', v_attacker->>'name',
          'damage', v_damage,
          'opponent_hp', v_opponent_hp,
          'timestamp', NOW()
        )
      );
    ELSE
      -- Attack opponent's monster
      v_damage := GREATEST(0, COALESCE((v_attacker->>'atk')::INT, 0));
      
      -- Apply effects and calculate final damage
      SELECT * INTO v_damage, v_game_state 
      FROM calculate_damage_and_apply_effects(v_game_state, v_attacker, v_target, v_damage, v_player_field, v_opponent_field);
      
      DECLARE
        v_target_current_hp INT;
        v_target_new_hp INT;
      BEGIN
        v_target_current_hp := COALESCE((v_target->>'current_hp')::INT, (v_target->>'def')::INT, 10);
        v_target_new_hp := v_target_current_hp - v_damage;
        
        IF v_target_new_hp <= 0 THEN
          v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_field, 'monster'], 'null'::jsonb);
          
          v_game_state := jsonb_set(
            v_game_state,
            '{battle_log}',
            COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
            jsonb_build_object(
              'action', 'MONSTER_DESTROYED',
              'player', v_player_turn,
              'attacker', v_attacker->>'name',
              'target', v_target->>'name',
              'damage', v_damage,
              'timestamp', NOW()
            )
          );
        ELSE
          v_target := jsonb_set(v_target, '{current_hp}', to_jsonb(v_target_new_hp));
          v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_field, 'monster'], v_target);
          
          v_game_state := jsonb_set(
            v_game_state,
            '{battle_log}',
            COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
            jsonb_build_object(
              'action', 'ATTACK_MONSTER',
              'player', v_player_turn,
              'attacker', v_attacker->>'name',
              'target', v_target->>'name',
              'damage', v_damage,
              'target_hp', v_target_new_hp,
              'timestamp', NOW()
            )
          );
        END IF;
      END;
      
      v_opponent_hp := COALESCE((v_game_state->>v_opponent_hp_key)::INT, 100);
    END IF;
  ELSE
    -- Direct attack to HP
    v_damage := COALESCE((v_attacker->>'atk')::INT, 0);
    
    SELECT * INTO v_damage, v_game_state 
    FROM calculate_damage_and_apply_effects(v_game_state, v_attacker, NULL, v_damage, v_player_field, v_opponent_field);
    
    v_opponent_hp := COALESCE((v_game_state->>v_opponent_hp_key)::INT, 100) - v_damage;
    v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_hp_key], to_jsonb(v_opponent_hp));
  END IF;
  
  -- Mark that player has attacked this turn
  v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
  
  -- Check for victory
  IF v_opponent_hp <= 0 THEN
    v_winner_id := p_player_id;
    v_week_start := get_week_start(CURRENT_DATE);
    
    -- Obter school_id do vencedor e perdedor
    SELECT current_school_id INTO v_winner_school_id FROM profiles WHERE id = v_winner_id;
    SELECT current_school_id INTO v_loser_school_id FROM profiles WHERE id = v_opponent_id;
    
    -- Dar XP ao vencedor (100 XP)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 100,
        level_xp = COALESCE(level_xp, 0) + 100
    WHERE id = v_winner_id;
    
    -- Logar XP semanal do vencedor
    IF v_winner_school_id IS NOT NULL THEN
      INSERT INTO weekly_xp_log (user_id, school_id, xp_earned, source, week_start)
      VALUES (v_winner_id, v_winner_school_id, 100, 'battle_win', v_week_start);
    END IF;
    
    -- Dar XP de consolação ao perdedor (25 XP)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 25,
        level_xp = COALESCE(level_xp, 0) + 25
    WHERE id = v_opponent_id;
    
    -- Logar XP semanal do perdedor
    IF v_loser_school_id IS NOT NULL THEN
      INSERT INTO weekly_xp_log (user_id, school_id, xp_earned, source, week_start)
      VALUES (v_opponent_id, v_loser_school_id, 25, 'battle_loss', v_week_start);
    END IF;
    
    UPDATE battles 
    SET game_state = v_game_state, 
        status = 'FINISHED', 
        winner_id = v_winner_id, 
        finished_at = NOW(),
        last_action_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object('success', true, 'victory', true, 'damage', v_damage, 'xp_winner', 100, 'xp_loser', 25);
  END IF;
  
  UPDATE battles 
  SET game_state = v_game_state,
      last_action_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object('success', true, 'damage', v_damage, 'opponent_hp', v_opponent_hp);
END;
$function$;

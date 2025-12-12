-- Drop and recreate attack function with corrected effect logic
DROP FUNCTION IF EXISTS public.attack(uuid, uuid);

CREATE OR REPLACE FUNCTION public.attack(p_battle_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batalha não encontrada';
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Batalha não está em andamento';
  END IF;
  
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
  
  v_damage := COALESCE((v_attacker_monster->>'atk')::INT, 0);
  
  -- Apply attacker's effects (BOOST)
  IF v_attacker_monster->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker_monster->'effects')
    LOOP
      v_effect_type := v_effect->>'type';
      v_effect_value := COALESCE((v_effect->>'value')::NUMERIC, 0);
      
      IF v_effect_type = 'BOOST' THEN
        -- BOOST uses format 1.X where 1.6 = +60% ATK (base + extra)
        -- Or integer format where 60 = +60%
        IF v_effect_value < 10 THEN
          -- Multiplier format: 1.6 means +60%, so damage + damage * (1.6 - 1)
          v_damage := v_damage + FLOOR(v_damage * (v_effect_value - 1))::INT;
        ELSE
          -- Integer percentage: 60 means +60%
          v_damage := v_damage + FLOOR(v_damage * v_effect_value / 100)::INT;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- Check defender's traps
  IF v_game_state->v_defender_field->'traps' IS NOT NULL AND 
     jsonb_array_length(v_game_state->v_defender_field->'traps') > 0 THEN
    
    v_trap := v_game_state->v_defender_field->'traps'->0;
    v_remaining_traps := v_game_state->v_defender_field->'traps' - 0;
    
    IF v_trap->'effects' IS NOT NULL THEN
      FOR v_effect IN SELECT * FROM jsonb_array_elements(v_trap->'effects')
      LOOP
        v_effect_type := v_effect->>'type';
        v_effect_value := COALESCE((v_effect->>'value')::NUMERIC, 0);
        
        IF v_effect_type = 'REFLECT' THEN
          -- REFLECT uses format 0.X where 0.5 = 50% reflected (direct multiplier)
          -- Or integer format where 50 = 50%
          IF v_effect_value < 1 THEN
            -- Decimal < 1: direct multiplier (0.5 = 50%)
            v_reflect_damage := FLOOR(v_damage * v_effect_value)::INT;
          ELSIF v_effect_value < 10 THEN
            -- Between 1-10: treat as multiplier (1.5 = 150%)
            v_reflect_damage := FLOOR(v_damage * v_effect_value)::INT;
          ELSE
            -- >= 10: integer percentage (50 = 50%)
            v_reflect_damage := FLOOR(v_damage * v_effect_value / 100)::INT;
          END IF;
          
          v_attacker_hp := COALESCE((v_game_state->>v_attacker_hp_key)::INT, 100);
          v_attacker_hp := v_attacker_hp - v_reflect_damage;
          v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_hp_key], to_jsonb(v_attacker_hp));
          v_trap_activated := true;
          v_trap_message := format('Armadilha %s ativada! Refletiu %s de dano!', v_trap->>'name', v_reflect_damage);
          
        ELSIF v_effect_type = 'REDUCE' THEN
          -- REDUCE uses format 0.X where 0.5 = reduce by 50% (keeps 50%)
          -- Or integer format where 50 = reduce by 50%
          IF v_effect_value < 1 THEN
            -- Decimal < 1: reduce by that percentage (0.5 = keep 50%)
            v_damage := FLOOR(v_damage * (1 - v_effect_value))::INT;
          ELSIF v_effect_value < 10 THEN
            -- Between 1-10: treat as multiplier reduction
            v_damage := FLOOR(v_damage / v_effect_value)::INT;
          ELSE
            -- >= 10: integer percentage (50 = reduce by 50%, keep 50%)
            v_damage := FLOOR(v_damage * (100 - v_effect_value) / 100)::INT;
          END IF;
          v_trap_activated := true;
          v_trap_message := format('Armadilha %s ativada! Dano reduzido!', v_trap->>'name');
          
        ELSIF v_effect_type = 'NULLIFY' THEN
          v_damage := 0;
          v_trap_activated := true;
          v_trap_message := format('Armadilha %s ativada! Ataque anulado!', v_trap->>'name');
        END IF;
      END LOOP;
    END IF;
    
    IF v_trap_activated THEN
      v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'traps'], v_remaining_traps);
    END IF;
  END IF;
  
  -- Apply damage
  IF v_defender_monster IS NOT NULL AND v_defender_monster != 'null'::jsonb THEN
    DECLARE
      v_monster_hp INT;
      v_max_hp INT;
    BEGIN
      v_monster_hp := COALESCE((v_defender_monster->>'current_hp')::INT, (v_defender_monster->>'def')::INT, 0);
      v_max_hp := COALESCE((v_defender_monster->>'max_hp')::INT, (v_defender_monster->>'def')::INT, 0);
      v_monster_hp := v_monster_hp - v_damage;
      
      IF v_monster_hp <= 0 THEN
        v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'monster'], 'null'::jsonb);
        
        v_game_state := jsonb_set(
          v_game_state,
          '{battle_log}',
          COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
          jsonb_build_object(
            'action', 'MONSTER_DESTROYED',
            'player', v_player_turn,
            'monster_name', v_defender_monster->>'name',
            'damage', v_damage,
            'timestamp', NOW()
          )
        );
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
  
  v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
  
  v_game_state := jsonb_set(
    v_game_state,
    '{battle_log}',
    COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
    jsonb_build_object(
      'action', 'ATTACK',
      'player', v_player_turn,
      'attacker', v_attacker_monster->>'name',
      'damage', v_damage,
      'trap_activated', v_trap_activated,
      'trap_message', v_trap_message,
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
    -- Grant XP to winner (100 XP)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 100,
        level_xp = COALESCE(level_xp, 0) + 100
    WHERE id = v_winner_id;
    
    -- Grant XP to loser (25 XP for participation)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 25,
        level_xp = COALESCE(level_xp, 0) + 25
    WHERE id = v_loser_id;
    
    -- Log weekly XP for winner
    v_week_start := get_week_start(CURRENT_DATE);
    INSERT INTO weekly_xp_log (user_id, school_id, week_start, xp_earned, source)
    SELECT v_winner_id, current_school_id, v_week_start, 100, 'battle_win'
    FROM profiles WHERE id = v_winner_id AND current_school_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    
    -- Log weekly XP for loser
    INSERT INTO weekly_xp_log (user_id, school_id, week_start, xp_earned, source)
    SELECT v_loser_id, current_school_id, v_week_start, 25, 'battle_loss'
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
      'xp_awarded', jsonb_build_object('winner', 100, 'loser', 25)
    );
  END IF;
  
  UPDATE battles SET
    game_state = v_game_state,
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object('success', true, 'game_state', v_game_state, 'damage', v_damage, 'trap_activated', v_trap_activated, 'trap_message', v_trap_message);
END;
$function$;
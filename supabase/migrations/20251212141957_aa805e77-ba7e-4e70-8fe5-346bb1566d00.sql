-- Drop BOTH conflicting function signatures to clean up
DROP FUNCTION IF EXISTS public.attack(uuid, uuid);
DROP FUNCTION IF EXISTS public.attack(uuid, uuid, text);

-- Recreate attack function with simple signature (no p_target_type)
CREATE OR REPLACE FUNCTION public.attack(p_battle_id uuid, p_player_id uuid)
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
  v_player_key TEXT;
  v_opponent_key TEXT;
  v_player_monster JSONB;
  v_opponent_monster JSONB;
  v_damage INT;
  v_opponent_hp INT;
  v_opponent_id UUID;
  v_winner_id UUID;
  v_current_turn_number INT;
  v_monster_summoned_turn INT;
  v_opponent_traps JSONB;
  v_activated_trap JSONB;
  v_trap_index INT;
  v_attack_blocked BOOLEAN := false;
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
  
  -- Determine player/opponent
  IF v_battle.player1_id = p_player_id THEN
    v_player_field := 'player1_field';
    v_opponent_field := 'player2_field';
    v_player_key := 'player1';
    v_opponent_key := 'player2';
    v_opponent_id := v_battle.player2_id;
    IF v_battle.current_turn != 'PLAYER1' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
    END IF;
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_field := 'player2_field';
    v_opponent_field := 'player1_field';
    v_player_key := 'player2';
    v_opponent_key := 'player1';
    v_opponent_id := v_battle.player1_id;
    IF v_battle.current_turn != 'PLAYER2' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Você não está nesta batalha');
  END IF;
  
  v_game_state := v_battle.game_state;
  v_current_turn_number := COALESCE((v_game_state->>'turn_number')::INT, 1);
  
  -- Check if already attacked this turn
  IF COALESCE((v_game_state->>'has_attacked_this_turn')::BOOLEAN, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já atacou neste turno');
  END IF;
  
  v_player_monster := v_game_state->v_player_field->'monster';
  v_opponent_monster := v_game_state->v_opponent_field->'monster';
  
  IF v_player_monster IS NULL OR v_player_monster = 'null'::jsonb THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não tem monstro no campo');
  END IF;
  
  -- Check summoning sickness
  v_monster_summoned_turn := COALESCE((v_player_monster->>'summoned_on_turn')::INT, 0);
  IF v_monster_summoned_turn = v_current_turn_number THEN
    RETURN jsonb_build_object('success', false, 'error', 'Monstro invocado neste turno não pode atacar (Summoning Sickness)');
  END IF;
  
  -- Check for opponent traps
  v_opponent_traps := COALESCE(v_game_state->v_opponent_field->'traps', '[]'::jsonb);
  v_trap_index := -1;
  
  FOR i IN 0..jsonb_array_length(v_opponent_traps) - 1 LOOP
    v_activated_trap := v_opponent_traps->i;
    IF v_activated_trap->'effects' IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_activated_trap->'effects') effect
        WHERE effect->>'type' = 'BLOCK_ATTACK'
      ) THEN
        v_trap_index := i;
        v_attack_blocked := true;
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  -- If trap blocks attack
  IF v_attack_blocked AND v_trap_index >= 0 THEN
    -- Remove trap from field
    v_opponent_traps := v_opponent_traps - v_trap_index;
    v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_field, 'traps'], v_opponent_traps);
    
    -- Log trap activation
    v_game_state := jsonb_set(
      v_game_state,
      '{battle_log}',
      COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
      jsonb_build_object(
        'action', 'TRAP_ACTIVATED',
        'player', v_opponent_key,
        'trap_name', v_activated_trap->>'name',
        'effect', 'BLOCK_ATTACK',
        'timestamp', NOW()
      )
    );
    
    -- Mark attack as done
    v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
    
    UPDATE battles 
    SET game_state = v_game_state, last_action_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'blocked', true, 
      'trap_name', v_activated_trap->>'name',
      'game_state', v_game_state
    );
  END IF;
  
  -- Calculate damage
  v_damage := COALESCE((v_player_monster->>'atk')::INT, 0);
  
  -- Apply effects that modify damage
  IF v_player_monster->'effects' IS NOT NULL THEN
    FOR i IN 0..jsonb_array_length(v_player_monster->'effects') - 1 LOOP
      DECLARE
        v_effect JSONB := v_player_monster->'effects'->i;
        v_effect_type TEXT := v_effect->>'type';
        v_effect_value INT := COALESCE((v_effect->>'value')::INT, 0);
      BEGIN
        IF v_effect_type = 'BOOST' THEN
          v_damage := v_damage + (v_damage * v_effect_value / 100);
        ELSIF v_effect_type = 'DOUBLE' THEN
          v_damage := v_damage * 2;
        END IF;
      END;
    END LOOP;
  END IF;
  
  -- Attack opponent monster or player directly
  IF v_opponent_monster IS NOT NULL AND v_opponent_monster != 'null'::jsonb THEN
    -- Attack monster
    v_opponent_hp := COALESCE((v_opponent_monster->>'current_hp')::INT, (v_opponent_monster->>'def')::INT, 0);
    v_opponent_hp := v_opponent_hp - v_damage;
    
    IF v_opponent_hp <= 0 THEN
      -- Monster destroyed
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_field, 'monster'], 'null'::jsonb);
      
      v_game_state := jsonb_set(
        v_game_state,
        '{battle_log}',
        COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
        jsonb_build_object(
          'action', 'MONSTER_DESTROYED',
          'attacker', v_player_monster->>'name',
          'destroyed', v_opponent_monster->>'name',
          'damage', v_damage,
          'timestamp', NOW()
        )
      );
    ELSE
      -- Update monster HP
      v_opponent_monster := jsonb_set(v_opponent_monster, '{current_hp}', to_jsonb(v_opponent_hp));
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_field, 'monster'], v_opponent_monster);
      
      v_game_state := jsonb_set(
        v_game_state,
        '{battle_log}',
        COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
        jsonb_build_object(
          'action', 'ATTACK_MONSTER',
          'attacker', v_player_monster->>'name',
          'target', v_opponent_monster->>'name',
          'damage', v_damage,
          'remaining_hp', v_opponent_hp,
          'timestamp', NOW()
        )
      );
    END IF;
  ELSE
    -- Direct attack to player HP
    v_opponent_hp := COALESCE((v_game_state->(v_opponent_key || '_hp'))::INT, 100);
    v_opponent_hp := v_opponent_hp - v_damage;
    v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(GREATEST(0, v_opponent_hp)));
    
    v_game_state := jsonb_set(
      v_game_state,
      '{battle_log}',
      COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
      jsonb_build_object(
        'action', 'DIRECT_ATTACK',
        'attacker', v_player_monster->>'name',
        'damage', v_damage,
        'opponent_hp_remaining', GREATEST(0, v_opponent_hp),
        'timestamp', NOW()
      )
    );
    
    -- Check if battle is won
    IF v_opponent_hp <= 0 THEN
      v_winner_id := p_player_id;
      v_week_start := get_week_start(CURRENT_DATE);
      
      -- Get school IDs for weekly XP log
      SELECT current_school_id INTO v_winner_school_id FROM profiles WHERE id = v_winner_id;
      SELECT current_school_id INTO v_loser_school_id FROM profiles WHERE id = v_opponent_id;
      
      -- Award XP to winner (100 XP)
      UPDATE profiles 
      SET total_xp = COALESCE(total_xp, 0) + 100,
          level_xp = COALESCE(level_xp, 0) + 100
      WHERE id = v_winner_id;
      
      -- Log weekly XP for winner
      IF v_winner_school_id IS NOT NULL THEN
        INSERT INTO weekly_xp_log (user_id, school_id, xp_earned, source, week_start)
        VALUES (v_winner_id, v_winner_school_id, 100, 'battle_win', v_week_start);
      END IF;
      
      -- Award consolation XP to loser (25 XP)
      UPDATE profiles 
      SET total_xp = COALESCE(total_xp, 0) + 25,
          level_xp = COALESCE(level_xp, 0) + 25
      WHERE id = v_opponent_id;
      
      -- Log weekly XP for loser
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
      
      RETURN jsonb_build_object('success', true, 'victory', true, 'damage', v_damage, 'game_state', v_game_state);
    END IF;
  END IF;
  
  -- Mark attack as done
  v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
  
  UPDATE battles 
  SET game_state = v_game_state, last_action_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object('success', true, 'damage', v_damage, 'game_state', v_game_state);
END;
$function$;
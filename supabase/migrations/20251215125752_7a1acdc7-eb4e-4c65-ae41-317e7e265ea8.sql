-- ============================================================
-- CORREÇÃO COMPLETA: play_card e attack
-- Resolve "Not your turn" e erros de validação
-- ============================================================

-- 1. DROP todas as versões de play_card e attack
DROP FUNCTION IF EXISTS public.play_card(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.play_card(uuid, uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.play_card(uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.attack(uuid, uuid);

-- ============================================================
-- 2. RECRIAR play_card com validação correta de turno
-- ============================================================
CREATE OR REPLACE FUNCTION public.play_card(
  p_battle_id UUID,
  p_player_id UUID,
  p_card_id UUID,
  p_is_trap BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_player_hand TEXT;
  v_player_field TEXT;
  v_player_turn TEXT;
  v_hand JSONB;
  v_card JSONB;
  v_card_index INTEGER := -1;
  v_i INTEGER;
  v_field JSONB;
  v_monster JSONB;
  v_traps JSONB;
BEGIN
  -- Get battle
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em progresso');
  END IF;
  
  -- Determine player position and validate turn
  IF v_battle.player1_id = p_player_id THEN
    v_player_turn := 'PLAYER1';
    v_player_hand := 'player1_hand';
    v_player_field := 'player1_field';
  ELSIF v_battle.player2_id = p_player_id THEN
    v_player_turn := 'PLAYER2';
    v_player_hand := 'player2_hand';
    v_player_field := 'player2_field';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Jogador não está nesta batalha');
  END IF;
  
  -- VALIDAÇÃO CORRETA: Comparar current_turn com PLAYER1/PLAYER2
  IF v_battle.current_turn != v_player_turn THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
  END IF;
  
  v_game_state := v_battle.game_state;
  v_hand := COALESCE(v_game_state->v_player_hand, '[]'::jsonb);
  v_field := COALESCE(v_game_state->v_player_field, '{"monster": null, "traps": []}'::jsonb);
  
  -- Find card in hand
  FOR v_i IN 0..jsonb_array_length(v_hand) - 1 LOOP
    IF (v_hand->v_i->>'id') = p_card_id::text THEN
      v_card := v_hand->v_i;
      v_card_index := v_i;
      EXIT;
    END IF;
  END LOOP;
  
  IF v_card_index = -1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Carta não encontrada na mão');
  END IF;
  
  -- Handle trap or monster placement
  IF p_is_trap THEN
    v_traps := COALESCE(v_field->'traps', '[]'::jsonb);
    
    -- Limit: 1 trap per player
    IF jsonb_array_length(v_traps) >= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Você já tem uma armadilha ativa');
    END IF;
    
    v_traps := v_traps || jsonb_build_array(v_card);
    v_field := jsonb_set(v_field, '{traps}', v_traps);
  ELSE
    -- Place as monster
    v_field := jsonb_set(v_field, '{monster}', v_card);
  END IF;
  
  -- Remove card from hand
  v_hand := v_hand - v_card_index;
  
  -- Update game state
  v_game_state := jsonb_set(v_game_state, ARRAY[v_player_hand], v_hand);
  v_game_state := jsonb_set(v_game_state, ARRAY[v_player_field], v_field);
  
  -- Update battle
  UPDATE battles SET
    game_state = v_game_state,
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'card_played', v_card,
    'is_trap', p_is_trap
  );
END;
$$;

-- ============================================================
-- 3. RECRIAR attack com validação correta de turno
-- XP: Vitória = 10, Derrota = 3 (rebalanceado)
-- ============================================================
CREATE OR REPLACE FUNCTION public.attack(p_battle_id uuid, p_attacker_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_battle RECORD;
    v_game_state JSONB;
    v_attacker_field TEXT;
    v_defender_field TEXT;
    v_attacker_hp_field TEXT;
    v_defender_hp_field TEXT;
    v_player_turn TEXT;
    v_attacker_monster JSONB;
    v_defender_monster JSONB;
    v_damage INTEGER;
    v_defender_hp INTEGER;
    v_attacker_hp INTEGER;
    v_battle_log JSONB;
    v_winner_id UUID := NULL;
    v_defender_traps JSONB;
    v_trap_activated BOOLEAN := FALSE;
    v_trap_effect TEXT := NULL;
    v_trap_value INTEGER := 0;
    v_winner_xp INTEGER := 10;
    v_loser_xp INTEGER := 3;
    v_loser_id UUID := NULL;
    v_winner_school_id UUID;
    v_loser_school_id UUID;
BEGIN
    -- Get battle with lock
    SELECT * INTO v_battle
    FROM battles
    WHERE id = p_battle_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Battle not found');
    END IF;

    IF v_battle.status != 'IN_PROGRESS' THEN
        RETURN json_build_object('success', false, 'error', 'Battle is not in progress');
    END IF;

    -- Determine player turn and validate
    IF v_battle.player1_id = p_attacker_id THEN
        v_player_turn := 'PLAYER1';
        v_attacker_field := 'player1_field';
        v_defender_field := 'player2_field';
        v_attacker_hp_field := 'player1_hp';
        v_defender_hp_field := 'player2_hp';
        v_loser_id := v_battle.player2_id;
    ELSIF v_battle.player2_id = p_attacker_id THEN
        v_player_turn := 'PLAYER2';
        v_attacker_field := 'player2_field';
        v_defender_field := 'player1_field';
        v_attacker_hp_field := 'player2_hp';
        v_defender_hp_field := 'player1_hp';
        v_loser_id := v_battle.player1_id;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Player not in this battle');
    END IF;

    -- VALIDAÇÃO CORRETA: Comparar current_turn com PLAYER1/PLAYER2
    IF v_battle.current_turn != v_player_turn THEN
        RETURN json_build_object('success', false, 'error', 'Not your turn');
    END IF;

    v_game_state := v_battle.game_state;

    v_attacker_monster := v_game_state->v_attacker_field->'monster';
    v_defender_monster := v_game_state->v_defender_field->'monster';

    IF v_attacker_monster IS NULL OR v_attacker_monster = 'null'::jsonb THEN
        RETURN json_build_object('success', false, 'error', 'No monster to attack with');
    END IF;

    v_defender_hp := (v_game_state->>v_defender_hp_field)::INTEGER;
    v_attacker_hp := (v_game_state->>v_attacker_hp_field)::INTEGER;

    -- Get defender traps
    v_defender_traps := COALESCE(v_game_state->v_defender_field->'traps', '[]'::jsonb);

    -- Calculate base damage
    IF v_defender_monster IS NOT NULL AND v_defender_monster != 'null'::jsonb THEN
        v_damage := GREATEST(0, (v_attacker_monster->>'atk')::INTEGER - (v_defender_monster->>'def')::INTEGER);
    ELSE
        v_damage := (v_attacker_monster->>'atk')::INTEGER;
    END IF;

    -- Check defender traps
    IF jsonb_array_length(v_defender_traps) > 0 THEN
        DECLARE
            v_trap JSONB := v_defender_traps->0;
            v_effects JSONB := v_trap->'effects';
            v_effect JSONB;
        BEGIN
            IF jsonb_array_length(v_effects) > 0 THEN
                v_effect := v_effects->0;
                v_trap_effect := v_effect->>'type';
                v_trap_value := COALESCE((v_effect->>'value')::INTEGER, 0);
                
                IF v_trap_effect = 'REFLECT' THEN
                    v_trap_activated := TRUE;
                    v_attacker_hp := v_attacker_hp - v_damage;
                    v_damage := 0;
                ELSIF v_trap_effect = 'REDUCE' THEN
                    v_trap_activated := TRUE;
                    v_damage := GREATEST(0, v_damage - v_trap_value);
                ELSIF v_trap_effect = 'SHIELD' OR v_trap_effect = 'NULLIFY' THEN
                    v_trap_activated := TRUE;
                    v_damage := 0;
                END IF;
            END IF;
            
            IF v_trap_activated THEN
                v_defender_traps := v_defender_traps - 0;
                v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'traps'], v_defender_traps);
            END IF;
        END;
    END IF;

    -- Apply damage
    v_defender_hp := v_defender_hp - v_damage;

    -- Update HP in game state
    v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_hp_field], to_jsonb(v_defender_hp));
    v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_hp_field], to_jsonb(v_attacker_hp));

    -- Add to battle log with all expected fields
    v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb);
    v_battle_log := v_battle_log || jsonb_build_object(
        'action', 'ATTACK',
        'attacker_id', p_attacker_id,
        'attacker_player', v_player_turn,
        'attacker', v_attacker_monster->>'name',
        'defender', CASE WHEN v_defender_monster IS NOT NULL AND v_defender_monster != 'null'::jsonb 
                        THEN v_defender_monster->>'name' 
                        ELSE 'HP Direto' END,
        'damage', v_damage,
        'trap_activated', v_trap_activated,
        'trap_effect', v_trap_effect,
        'timestamp', now()
    );
    v_game_state := jsonb_set(v_game_state, ARRAY['battle_log'], v_battle_log);

    -- Check for winner
    IF v_defender_hp <= 0 THEN
        v_winner_id := p_attacker_id;
    ELSIF v_attacker_hp <= 0 THEN
        v_winner_id := v_loser_id;
        v_loser_id := p_attacker_id;
    END IF;

    -- Update battle
    IF v_winner_id IS NOT NULL THEN
        -- Get school_ids for XP logging
        SELECT current_school_id INTO v_winner_school_id FROM profiles WHERE id = v_winner_id;
        SELECT current_school_id INTO v_loser_school_id FROM profiles WHERE id = v_loser_id;

        UPDATE battles
        SET 
            game_state = v_game_state,
            status = 'FINISHED',
            winner_id = v_winner_id,
            finished_at = now(),
            updated_at = now()
        WHERE id = p_battle_id;

        -- Award XP to winner
        UPDATE profiles 
        SET 
            level_xp = COALESCE(level_xp, 0) + v_winner_xp,
            total_xp = COALESCE(total_xp, 0) + v_winner_xp
        WHERE id = v_winner_id;

        -- Award consolation XP to loser
        UPDATE profiles 
        SET 
            level_xp = COALESCE(level_xp, 0) + v_loser_xp,
            total_xp = COALESCE(total_xp, 0) + v_loser_xp
        WHERE id = v_loser_id;

        -- Log XP in weekly_xp_log with correct columns (xp_earned, school_id required)
        IF v_winner_school_id IS NOT NULL THEN
            INSERT INTO weekly_xp_log (user_id, school_id, xp_earned, source, week_start)
            VALUES (v_winner_id, v_winner_school_id, v_winner_xp, 'battle_win', date_trunc('week', now())::date);
        END IF;
        
        IF v_loser_school_id IS NOT NULL THEN
            INSERT INTO weekly_xp_log (user_id, school_id, xp_earned, source, week_start)
            VALUES (v_loser_id, v_loser_school_id, v_loser_xp, 'battle_loss', date_trunc('week', now())::date);
        END IF;

        -- Remove from queue
        DELETE FROM battle_queue WHERE user_id IN (v_battle.player1_id, v_battle.player2_id);
    ELSE
        -- Switch turns
        UPDATE battles
        SET 
            game_state = v_game_state,
            current_turn = CASE 
                WHEN v_player_turn = 'PLAYER1' THEN 'PLAYER2'
                ELSE 'PLAYER1'
            END,
            turn_started_at = now(),
            last_action_at = now(),
            updated_at = now()
        WHERE id = p_battle_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'damage', v_damage,
        'defender_hp', v_defender_hp,
        'attacker_hp', v_attacker_hp,
        'trap_activated', v_trap_activated,
        'trap_effect', v_trap_effect,
        'winner_id', v_winner_id
    );
END;
$$;
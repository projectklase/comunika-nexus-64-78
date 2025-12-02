
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
        'timestamp', NOW()
      );
  ELSE
    -- SISTEMA HEARTHSTONE: Combate simultâneo
    v_defender_atk := (v_defender->>'atk')::INT;
    v_attacker_hp := COALESCE((v_attacker->>'current_hp')::INT, (v_attacker->>'def')::INT);
    v_defender_hp := COALESCE((v_defender->>'current_hp')::INT, (v_defender->>'def')::INT);
    
    -- Ambos causam dano simultaneamente
    v_attacker_hp := v_attacker_hp - v_defender_atk;
    v_defender_hp := v_defender_hp - v_attacker_atk;
    
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
        'timestamp', NOW()
      );
  END IF;
  
  v_game_state := jsonb_set(v_game_state, '{battle_log}', v_battle_log);
  
  -- Trocar turno
  v_next_turn := CASE WHEN v_player_number = 'PLAYER1' THEN 'PLAYER2' ELSE 'PLAYER1' END;

  -- Verificar vitória por HP
  v_player_hp := (v_game_state->>v_player_hp_key)::INT;
  v_opponent_hp := COALESCE((v_game_state->>v_opponent_hp_key)::INT, 100);
  
  IF v_opponent_hp <= 0 THEN
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
      'victory_type', 'HP_ZERO'
    );
  ELSIF v_player_hp <= 0 THEN
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
      'victory_type', 'HP_ZERO'
    );
  END IF;

  -- NOVA VERIFICAÇÃO: Vitória por deck-out (oponente sem cartas na mão E sem monstro no campo)
  v_opponent_hand_count := COALESCE(jsonb_array_length(v_game_state->(LOWER(v_opponent_number) || '_hand')), 0);
  v_opponent_monster := v_game_state->v_opponent_field->'monster';
  
  IF v_opponent_hand_count = 0 AND (v_opponent_monster IS NULL OR v_opponent_monster = 'null'::jsonb) THEN
    -- Log de vitória por falta de recursos
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
      'victory_type', 'DECK_OUT'
    );
  END IF;

  UPDATE battles 
  SET game_state = v_game_state,
      current_turn = v_next_turn,
      turn_started_at = NOW(),
      last_action_at = NOW()
  WHERE id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'game_state', v_game_state, 'next_turn', v_next_turn);
END;
$function$;

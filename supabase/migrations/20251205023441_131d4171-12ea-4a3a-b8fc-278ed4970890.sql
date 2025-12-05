-- Update check_turn_timeout to return turn_passed: true for frontend compatibility
CREATE OR REPLACE FUNCTION public.check_turn_timeout(p_battle_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_battle RECORD;
  v_timeout_seconds INTEGER := 30;
  v_elapsed_seconds NUMERIC;
  v_new_turn TEXT;
  v_opponent_id UUID;
BEGIN
  -- Fetch battle data
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em andamento');
  END IF;
  
  -- Calculate elapsed time since turn started
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - COALESCE(v_battle.turn_started_at, v_battle.started_at)));
  
  -- Check if timeout occurred
  IF v_elapsed_seconds < v_timeout_seconds THEN
    RETURN jsonb_build_object('success', false, 'timeout_occurred', false, 'turn_passed', false, 'elapsed', v_elapsed_seconds);
  END IF;
  
  -- Timeout! Switch turn
  IF v_battle.current_turn = 'PLAYER1' THEN
    v_new_turn := 'PLAYER2';
    v_opponent_id := v_battle.player2_id;
  ELSE
    v_new_turn := 'PLAYER1';
    v_opponent_id := v_battle.player1_id;
  END IF;
  
  -- Reset turn state flags
  UPDATE battles SET
    current_turn = v_new_turn,
    turn_started_at = NOW(),
    last_action_at = NOW(),
    updated_at = NOW(),
    game_state = jsonb_set(
      jsonb_set(
        jsonb_set(
          game_state,
          '{has_attacked_this_turn}', 'false'::jsonb
        ),
        '{has_played_card_this_turn}', 'false'::jsonb
      ),
      '{turn_number}', to_jsonb(COALESCE((game_state->>'turn_number')::INT, 1) + 1)
    )
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'timeout_occurred', true,
    'turn_passed', true,
    'new_turn', v_new_turn,
    'next_player_id', v_opponent_id
  );
END;
$function$;
-- Phase 5: Turn timeout system
-- Create function to check and auto-pass turn after 15 seconds

CREATE OR REPLACE FUNCTION check_turn_timeout(p_battle_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_battle battles%ROWTYPE;
  v_elapsed_seconds INT;
BEGIN
  -- Fetch battle
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND OR v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Battle not active');
  END IF;
  
  -- Calculate seconds elapsed since turn started
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_battle.turn_started_at))::INT;
  
  -- If more than 15 seconds passed, auto-pass turn
  IF v_elapsed_seconds >= 15 THEN
    UPDATE battles
    SET 
      current_turn = CASE 
        WHEN current_turn = 'PLAYER1' THEN 'PLAYER2' 
        ELSE 'PLAYER1' 
      END,
      turn_started_at = NOW(),
      last_action_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'turn_passed', true,
      'reason', 'Turn timeout after 15 seconds'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'turn_passed', false,
    'remaining_seconds', 15 - v_elapsed_seconds
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
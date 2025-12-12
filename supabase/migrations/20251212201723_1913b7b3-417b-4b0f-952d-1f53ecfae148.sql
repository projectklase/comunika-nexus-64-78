-- RPC para incrementar progresso do desafio DAILY_CHECKIN após check-in
CREATE OR REPLACE FUNCTION public.increment_daily_checkin_progress(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge_id uuid;
  v_student_challenge_id uuid;
  v_current_progress int;
  v_action_count int;
  v_koin_reward int;
  v_xp_reward int;
BEGIN
  -- Buscar o desafio DAILY_CHECKIN ativo
  SELECT id, action_count, koin_reward, COALESCE(xp_reward, 0)
  INTO v_challenge_id, v_action_count, v_koin_reward, v_xp_reward
  FROM challenges
  WHERE action_target = 'DAILY_CHECKIN'
    AND is_active = true
  LIMIT 1;

  IF v_challenge_id IS NULL THEN
    RETURN; -- Sem desafio ativo, nada a fazer
  END IF;

  -- Verificar se o estudante já tem este desafio em andamento
  SELECT id, current_progress
  INTO v_student_challenge_id, v_current_progress
  FROM student_challenges
  WHERE student_id = p_student_id
    AND challenge_id = v_challenge_id
    AND status = 'IN_PROGRESS';

  IF v_student_challenge_id IS NULL THEN
    -- Criar registro se não existir
    INSERT INTO student_challenges (student_id, challenge_id, status, current_progress, started_at)
    VALUES (p_student_id, v_challenge_id, 'IN_PROGRESS', 1, NOW())
    RETURNING id, current_progress INTO v_student_challenge_id, v_current_progress;
  ELSE
    -- Incrementar progresso
    v_current_progress := v_current_progress + 1;
    
    UPDATE student_challenges
    SET current_progress = v_current_progress,
        updated_at = NOW()
    WHERE id = v_student_challenge_id;
  END IF;

  -- Verificar se completou o desafio
  IF v_current_progress >= v_action_count THEN
    -- Marcar como completado
    UPDATE student_challenges
    SET status = 'COMPLETED',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_student_challenge_id;

    -- Dar recompensas
    UPDATE profiles
    SET koins = koins + v_koin_reward,
        total_xp = COALESCE(total_xp, 0) + v_xp_reward,
        level_xp = COALESCE(level_xp, 0) + v_xp_reward
    WHERE id = p_student_id;

    -- Registrar transação de Koins
    INSERT INTO koin_transactions (user_id, type, amount, description)
    VALUES (p_student_id, 'EARN_CHALLENGE', v_koin_reward, 'Desafio completado: Faça check-in');
  END IF;
END;
$$;
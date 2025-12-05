-- 1) Atualizar complete_challenge_and_reward para dar XP junto com Koins
CREATE OR REPLACE FUNCTION public.complete_challenge_and_reward(
  p_student_id UUID,
  p_student_challenge_id UUID,
  p_koin_reward INTEGER,
  p_challenge_title TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Buscar saldo atual
  SELECT koins INTO v_current_balance
  FROM profiles
  WHERE id = p_student_id;

  -- Marcar desafio como completado
  UPDATE student_challenges
  SET 
    status = 'COMPLETED',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_student_challenge_id;

  -- Atualizar Koins E XP do aluno
  UPDATE profiles
  SET 
    koins = koins + p_koin_reward,
    total_xp = COALESCE(total_xp, 0) + p_koin_reward
  WHERE id = p_student_id;

  -- Registrar transação de Koins
  INSERT INTO koin_transactions (
    user_id,
    type,
    amount,
    description,
    balance_before,
    balance_after
  ) VALUES (
    p_student_id,
    'EARN_CHALLENGE',
    p_koin_reward,
    'Desafio completado: ' || p_challenge_title,
    v_current_balance,
    v_current_balance + p_koin_reward
  );

  -- Criar notificação de celebração
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    meta
  ) VALUES (
    p_student_id,
    'KOIN_BONUS',
    'Desafio Completado! 🎉',
    'Você completou o desafio "' || p_challenge_title || '" e ganhou ' || p_koin_reward || ' Koins e ' || p_koin_reward || ' XP!',
    jsonb_build_object(
      'source', 'challenge_system',
      'challengeTitle', p_challenge_title,
      'koinsEarned', p_koin_reward,
      'xpEarned', p_koin_reward,
      'celebrationType', 'confetti'
    )
  );
END;
$$;

-- 2) Corrigir XP do Arnold Schwarzenegger (+100 do desafio que completou)
UPDATE profiles 
SET total_xp = COALESCE(total_xp, 0) + 100 
WHERE id = '49238b9a-2153-483a-8330-7c7d51e65d11';
-- Fix role_target constraint violation in complete_challenge_and_reward function
-- Change 'aluno' to 'ALUNO' to match notifications table constraint

CREATE OR REPLACE FUNCTION public.complete_challenge_and_reward(
  p_student_id uuid, 
  p_student_challenge_id uuid, 
  p_koin_reward integer, 
  p_challenge_title text
)
RETURNS void AS $$
DECLARE
  v_student_balance INTEGER;
BEGIN
  -- Get student's current balance
  SELECT koins INTO v_student_balance
  FROM public.profiles
  WHERE id = p_student_id;
  
  -- Mark challenge as completed
  UPDATE public.student_challenges
  SET 
    status = 'COMPLETED',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_student_challenge_id;
  
  -- Create koin transaction
  INSERT INTO public.koin_transactions (
    user_id,
    type,
    amount,
    description,
    related_entity_id,
    balance_before,
    balance_after
  ) VALUES (
    p_student_id,
    'BONUS',
    p_koin_reward,
    'Desafio Concluído: ' || p_challenge_title,
    NULL,
    v_student_balance,
    v_student_balance + p_koin_reward
  );
  
  -- Update profile balance
  UPDATE public.profiles
  SET koins = koins + p_koin_reward
  WHERE id = p_student_id;
  
  -- Create notification with correct role_target (ALUNO in uppercase)
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    role_target,
    link,
    is_read,
    meta
  ) VALUES (
    p_student_id,
    'KOIN_BONUS',
    'Desafio Concluído! 🎉',
    'Você ganhou ' || p_koin_reward || ' Koins ao completar: ' || p_challenge_title,
    'ALUNO',  -- Fixed: uppercase to match constraint
    '/aluno/nexus',
    false,
    jsonb_build_object(
      'koinAmount', p_koin_reward,
      'challengeTitle', p_challenge_title,
      'source', 'challenge_system',
      'icon', '🏆',
      'celebrationType', 'confetti'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
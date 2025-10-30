-- ============================================================
-- FASE 2: Manter desafios completados visíveis até o reset
-- ============================================================

-- Drop da função existente para poder modificar o retorno
DROP FUNCTION IF EXISTS public.get_student_challenges_with_progress(uuid);

CREATE OR REPLACE FUNCTION public.get_student_challenges_with_progress(p_student_id uuid)
RETURNS TABLE(
  challenge_id uuid,
  student_challenge_id uuid,
  title text,
  description text,
  koin_reward integer,
  challenge_type text,
  action_target text,
  action_count integer,
  current_progress integer,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  icon_name text,
  is_current_cycle boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS challenge_id,
    sc.id AS student_challenge_id,
    c.title,
    c.description,
    c.koin_reward,
    c.type AS challenge_type,
    c.action_target,
    c.action_count,
    sc.current_progress,
    sc.status,
    sc.started_at,
    sc.expires_at,
    c.icon_name,
    -- ✅ NOVO: Verificar se é do ciclo atual
    CASE
      WHEN c.type = 'DAILY' THEN 
        DATE(sc.started_at) = CURRENT_DATE
      WHEN c.type = 'WEEKLY' THEN
        DATE_TRUNC('week', sc.started_at) = DATE_TRUNC('week', CURRENT_TIMESTAMP)
      ELSE true
    END AS is_current_cycle
  FROM public.student_challenges sc
  JOIN public.challenges c ON sc.challenge_id = c.id
  WHERE sc.student_id = p_student_id
    AND sc.status IN ('IN_PROGRESS', 'COMPLETED')
    -- ✅ NOVO: Mostrar completados do ciclo atual
    AND (
      sc.status = 'IN_PROGRESS' 
      OR (sc.status = 'COMPLETED' AND (
        (c.type = 'DAILY' AND DATE(sc.completed_at) = CURRENT_DATE) OR
        (c.type = 'WEEKLY' AND DATE_TRUNC('week', sc.completed_at) = DATE_TRUNC('week', CURRENT_TIMESTAMP)) OR
        c.type = 'ACHIEVEMENT'
      ))
    )
  ORDER BY 
    CASE WHEN sc.status = 'IN_PROGRESS' THEN 0 ELSE 1 END,
    c.koin_reward DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- QOL 3: Notificação de desafio completado com confetti
-- ============================================================

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
  SELECT koins INTO v_student_balance
  FROM public.profiles
  WHERE id = p_student_id;
  
  UPDATE public.student_challenges
  SET 
    status = 'COMPLETED',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_student_challenge_id;
  
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
  
  UPDATE public.profiles
  SET koins = koins + p_koin_reward
  WHERE id = p_student_id;
  
  -- ✅ NOVO: Adicionar meta com icon e celebration type
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
    'aluno',
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
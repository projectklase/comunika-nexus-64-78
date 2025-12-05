-- ======================================
-- FASE 1: Adicionar coluna xp_reward à tabela challenges (se não existir)
-- ======================================
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 0;

-- Migrar desafios existentes: xp_reward = koin_reward (manter comportamento atual)
UPDATE public.challenges SET xp_reward = koin_reward WHERE xp_reward = 0 OR xp_reward IS NULL;

-- ======================================
-- FASE 2: Dropar função get_student_challenges_with_progress para poder recriá-la
-- ======================================
DROP FUNCTION IF EXISTS public.get_student_challenges_with_progress(uuid);

-- ======================================
-- FASE 3: Recriar função get_student_challenges_with_progress com xp_reward
-- ======================================
CREATE OR REPLACE FUNCTION public.get_student_challenges_with_progress(p_student_id uuid)
RETURNS TABLE(
  challenge_id uuid,
  student_challenge_id uuid,
  title text,
  description text,
  koin_reward integer,
  xp_reward integer,
  challenge_type text,
  action_target text,
  action_count integer,
  current_progress integer,
  status text,
  started_at timestamp with time zone,
  expires_at timestamp with time zone,
  icon_name text,
  is_current_cycle boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS challenge_id,
    sc.id AS student_challenge_id,
    c.title,
    c.description,
    c.koin_reward,
    COALESCE(c.xp_reward, 0) AS xp_reward,
    c.type AS challenge_type,
    c.action_target,
    c.action_count,
    sc.current_progress,
    sc.status,
    sc.started_at,
    sc.expires_at,
    c.icon_name,
    CASE 
      WHEN c.type = 'DAILY' AND sc.started_at::date = CURRENT_DATE THEN true
      WHEN c.type = 'WEEKLY' AND sc.started_at >= date_trunc('week', CURRENT_DATE) THEN true
      ELSE false
    END AS is_current_cycle
  FROM student_challenges sc
  JOIN challenges c ON sc.challenge_id = c.id
  WHERE sc.student_id = p_student_id
    AND c.is_active = true
    AND (sc.status = 'IN_PROGRESS' OR (sc.status = 'COMPLETED' AND sc.completed_at > NOW() - INTERVAL '24 hours'))
  ORDER BY 
    CASE sc.status WHEN 'IN_PROGRESS' THEN 0 ELSE 1 END,
    c.type,
    c.koin_reward DESC;
END;
$$;

-- ======================================
-- FASE 4: Atualizar função complete_challenge_and_reward para aceitar xp_reward
-- ======================================
CREATE OR REPLACE FUNCTION public.complete_challenge_and_reward(
  p_student_id UUID,
  p_student_challenge_id UUID,
  p_koin_reward INTEGER,
  p_xp_reward INTEGER,
  p_challenge_title TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_student_balance INTEGER;
  v_student_xp INTEGER;
  v_school_id UUID;
  v_reward_message TEXT;
BEGIN
  -- Marcar desafio como completado
  UPDATE public.student_challenges
  SET 
    status = 'COMPLETED',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_student_challenge_id;
  
  -- Buscar saldo atual e XP do estudante
  SELECT koins, total_xp, current_school_id 
  INTO v_student_balance, v_student_xp, v_school_id
  FROM public.profiles
  WHERE id = p_student_id;
  
  -- Construir mensagem de recompensa inteligente
  IF p_koin_reward > 0 AND p_xp_reward > 0 THEN
    v_reward_message := 'Você ganhou ' || p_koin_reward || ' Koins e ' || p_xp_reward || ' XP!';
  ELSIF p_koin_reward > 0 THEN
    v_reward_message := 'Você ganhou ' || p_koin_reward || ' Koins!';
  ELSIF p_xp_reward > 0 THEN
    v_reward_message := 'Você ganhou ' || p_xp_reward || ' XP!';
  ELSE
    v_reward_message := 'Desafio completado!';
  END IF;
  
  -- Atualizar Koins APENAS se > 0
  IF p_koin_reward > 0 THEN
    -- Registrar transação de Koins
    INSERT INTO public.koin_transactions (
      user_id,
      type,
      amount,
      description,
      school_id,
      balance_before,
      balance_after
    ) VALUES (
      p_student_id,
      'EARN_CHALLENGE',
      p_koin_reward,
      'Desafio completado: ' || p_challenge_title,
      v_school_id,
      v_student_balance,
      v_student_balance + p_koin_reward
    );
    
    -- Atualizar saldo de Koins
    UPDATE public.profiles
    SET koins = koins + p_koin_reward
    WHERE id = p_student_id;
  END IF;
  
  -- Atualizar XP APENAS se > 0
  IF p_xp_reward > 0 THEN
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + p_xp_reward
    WHERE id = p_student_id;
  END IF;
  
  -- Criar notificação com meta para celebração
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    meta
  ) VALUES (
    p_student_id,
    'KOIN_BONUS',
    '🎉 Desafio Completado!',
    v_reward_message,
    jsonb_build_object(
      'source', 'challenge_system',
      'challenge_title', p_challenge_title,
      'koin_reward', p_koin_reward,
      'xp_reward', p_xp_reward,
      'celebrationType', 'confetti'
    )
  );
END;
$$;

-- ======================================
-- FASE 5: Atualizar TODOS os triggers para passar xp_reward
-- ======================================

-- 5.1 handle_post_read_challenge
CREATE OR REPLACE FUNCTION public.handle_post_read_challenge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  FOR v_challenge IN
    SELECT 
      sc.id AS student_challenge_id,
      c.id AS challenge_id,
      c.title,
      c.koin_reward,
      COALESCE(c.xp_reward, 0) AS xp_reward,
      c.action_count,
      sc.current_progress
    FROM public.student_challenges sc
    JOIN public.challenges c ON sc.challenge_id = c.id
    WHERE sc.student_id = NEW.user_id
      AND c.action_target = 'READ_POST'
      AND sc.status = 'IN_PROGRESS'
  LOOP
    UPDATE public.student_challenges
    SET 
      current_progress = current_progress + 1,
      updated_at = NOW()
    WHERE id = v_challenge.student_challenge_id;
    
    IF (v_challenge.current_progress + 1) >= v_challenge.action_count THEN
      PERFORM complete_challenge_and_reward(
        NEW.user_id,
        v_challenge.student_challenge_id,
        v_challenge.koin_reward,
        v_challenge.xp_reward,
        v_challenge.title
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- 5.2 handle_invite_friend_challenge
CREATE OR REPLACE FUNCTION public.handle_invite_friend_challenge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  SELECT 
    sc.id AS student_challenge_id,
    c.id AS challenge_id,
    c.title,
    c.koin_reward,
    COALESCE(c.xp_reward, 0) AS xp_reward,
    c.action_count,
    sc.current_progress
  INTO v_challenge
  FROM public.student_challenges sc
  JOIN public.challenges c ON sc.challenge_id = c.id
  WHERE sc.student_id = NEW.inviting_student_id
    AND c.action_target = 'INVITE_FRIEND'
    AND sc.status = 'IN_PROGRESS'
  ORDER BY c.koin_reward DESC
  LIMIT 1;
  
  IF FOUND THEN
    UPDATE public.student_challenges
    SET 
      current_progress = current_progress + 1,
      updated_at = NOW()
    WHERE id = v_challenge.student_challenge_id;
    
    IF (v_challenge.current_progress + 1) >= v_challenge.action_count THEN
      PERFORM complete_challenge_and_reward(
        NEW.inviting_student_id,
        v_challenge.student_challenge_id,
        v_challenge.koin_reward,
        v_challenge.xp_reward,
        v_challenge.title
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5.3 handle_attend_event_challenge
CREATE OR REPLACE FUNCTION public.handle_attend_event_challenge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  SELECT 
    sc.id AS student_challenge_id,
    c.id AS challenge_id,
    c.title,
    c.koin_reward,
    COALESCE(c.xp_reward, 0) AS xp_reward,
    c.action_count,
    sc.current_progress
  INTO v_challenge
  FROM public.student_challenges sc
  JOIN public.challenges c ON sc.challenge_id = c.id
  WHERE sc.student_id = NEW.student_id
    AND c.action_target = 'ATTEND_EVENT'
    AND sc.status = 'IN_PROGRESS'
  ORDER BY c.koin_reward DESC
  LIMIT 1;
  
  IF FOUND THEN
    UPDATE public.student_challenges
    SET 
      current_progress = current_progress + 1,
      updated_at = NOW()
    WHERE id = v_challenge.student_challenge_id;
    
    IF (v_challenge.current_progress + 1) >= v_challenge.action_count THEN
      PERFORM complete_challenge_and_reward(
        NEW.student_id,
        v_challenge.student_challenge_id,
        v_challenge.koin_reward,
        v_challenge.xp_reward,
        v_challenge.title
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5.4 handle_complete_profile_challenge
CREATE OR REPLACE FUNCTION public.handle_complete_profile_challenge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_challenge RECORD;
  v_is_complete BOOLEAN;
BEGIN
  v_is_complete := (
    NEW.name IS NOT NULL AND NEW.name != '' AND
    NEW.email IS NOT NULL AND NEW.email != '' AND
    NEW.avatar IS NOT NULL AND NEW.avatar != '' AND
    NEW.phone IS NOT NULL AND NEW.phone != '' AND
    NEW.dob IS NOT NULL
  );
  
  IF v_is_complete THEN
    SELECT 
      sc.id AS student_challenge_id,
      c.id AS challenge_id,
      c.title,
      c.koin_reward,
      COALESCE(c.xp_reward, 0) AS xp_reward,
      c.action_count,
      sc.current_progress
    INTO v_challenge
    FROM public.student_challenges sc
    JOIN public.challenges c ON sc.challenge_id = c.id
    WHERE sc.student_id = NEW.id
      AND c.action_target = 'COMPLETE_PROFILE'
      AND sc.status = 'IN_PROGRESS'
    ORDER BY c.koin_reward DESC
    LIMIT 1;
    
    IF FOUND AND v_challenge.current_progress < v_challenge.action_count THEN
      UPDATE public.student_challenges
      SET 
        current_progress = v_challenge.action_count,
        updated_at = NOW()
      WHERE id = v_challenge.student_challenge_id;
      
      PERFORM complete_challenge_and_reward(
        NEW.id,
        v_challenge.student_challenge_id,
        v_challenge.koin_reward,
        v_challenge.xp_reward,
        v_challenge.title
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
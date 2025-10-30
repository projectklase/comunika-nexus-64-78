-- ============================================
-- FASE 1: Criar triggers para leituras e entregas
-- ============================================

-- 1.1. Trigger para leituras de posts
CREATE TRIGGER trigger_handle_post_read_challenge
  AFTER INSERT ON public.post_reads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_post_read_challenge();

-- 1.2. Recriar trigger para entregas (já existe a função, só criar trigger)
DROP TRIGGER IF EXISTS trigger_handle_delivery_challenge ON public.deliveries;

CREATE TRIGGER trigger_handle_delivery_challenge
  AFTER INSERT OR UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_delivery_challenge();

-- ============================================
-- FASE 3: Implementar ações faltantes
-- ============================================

-- 3.1. INVITE_FRIEND - Convidar amigo para evento
CREATE OR REPLACE FUNCTION public.handle_invite_friend_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  SELECT 
    sc.id AS student_challenge_id,
    c.id AS challenge_id,
    c.title,
    c.koin_reward,
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
        v_challenge.title
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_handle_invite_friend_challenge
  AFTER INSERT ON public.event_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invite_friend_challenge();

-- 3.2. ATTEND_EVENT - Comparecer a evento
CREATE OR REPLACE FUNCTION public.handle_attend_event_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  SELECT 
    sc.id AS student_challenge_id,
    c.id AS challenge_id,
    c.title,
    c.koin_reward,
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
        v_challenge.title
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_handle_attend_event_challenge
  AFTER INSERT ON public.event_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_attend_event_challenge();

-- 3.3. COMPLETE_PROFILE - Completar perfil
CREATE OR REPLACE FUNCTION public.handle_complete_profile_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge RECORD;
  v_is_complete BOOLEAN;
BEGIN
  -- Verificar se perfil está completo (nome, email, avatar, phone, dob preenchidos)
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
        v_challenge.title
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_handle_complete_profile_challenge
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_complete_profile_challenge();
-- =====================================================
-- Adicionar DAILY_CHECKIN ao sistema de desafios
-- =====================================================

-- Fase 1: Atualizar constraint para incluir DAILY_CHECKIN
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_action_target_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_action_target_check 
  CHECK (action_target IN (
    'READ_POST', 'SUBMIT_ACTIVITY', 'COMPLETE_PROFILE', 
    'INVITE_FRIEND', 'ATTEND_EVENT', 'DAILY_CHECKIN'
  ));

-- =====================================================
-- Fase 2: Criar trigger para detectar check-ins diários
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_daily_checkin_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Só processa se last_activity_date mudou para uma data mais recente
  IF (NEW.last_activity_date IS NOT NULL 
      AND (OLD.last_activity_date IS NULL OR NEW.last_activity_date > OLD.last_activity_date)) THEN
    
    -- Buscar desafio ativo de DAILY_CHECKIN para este aluno
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
      AND c.action_target = 'DAILY_CHECKIN'
      AND sc.status = 'IN_PROGRESS'
    ORDER BY c.koin_reward DESC
    LIMIT 1;
    
    IF FOUND THEN
      -- Incrementar progresso
      UPDATE public.student_challenges
      SET current_progress = current_progress + 1, updated_at = NOW()
      WHERE id = v_challenge.student_challenge_id;
      
      -- Verificar se completou o desafio
      IF (v_challenge.current_progress + 1) >= v_challenge.action_count THEN
        PERFORM complete_challenge_and_reward(
          NEW.id,
          v_challenge.student_challenge_id,
          v_challenge.koin_reward,
          v_challenge.xp_reward,
          v_challenge.title
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela profiles (dispara quando last_activity_date muda)
DROP TRIGGER IF EXISTS trigger_daily_checkin_challenge ON public.profiles;
CREATE TRIGGER trigger_daily_checkin_challenge
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.last_activity_date IS DISTINCT FROM OLD.last_activity_date)
  EXECUTE FUNCTION public.handle_daily_checkin_challenge();
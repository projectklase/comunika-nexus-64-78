-- =====================================================
-- Fase 1: Remover desafios com ações inválidas
-- =====================================================

-- Primeiro, remover student_challenges relacionados a desafios com ações inválidas
DELETE FROM public.student_challenges 
WHERE challenge_id IN (
  SELECT id FROM public.challenges 
  WHERE action_target IN ('COMMENT_POST', 'LIKE_POST', 'SHARE_POST', 'LOGIN_STREAK', 'PERFECT_SCORE')
);

-- Remover desafios com ações inválidas
DELETE FROM public.challenges 
WHERE action_target IN ('COMMENT_POST', 'LIKE_POST', 'SHARE_POST', 'LOGIN_STREAK', 'PERFECT_SCORE');

-- =====================================================
-- Fase 2: Corrigir trigger handle_delivery_challenge
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_delivery_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Só processa quando uma entrega é APROVADA
  IF (NEW.review_status = 'APROVADA' AND (OLD.review_status IS NULL OR OLD.review_status != 'APROVADA')) THEN
    -- Buscar desafio ativo de SUBMIT_ACTIVITY para este aluno
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
      AND c.action_target = 'SUBMIT_ACTIVITY'
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
          NEW.student_id,
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

-- Garantir que o trigger existe na tabela deliveries
DROP TRIGGER IF EXISTS trigger_delivery_challenge ON public.deliveries;
CREATE TRIGGER trigger_delivery_challenge
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_delivery_challenge();
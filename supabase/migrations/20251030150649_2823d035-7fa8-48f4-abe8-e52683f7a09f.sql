-- ✅ CORREÇÃO CRÍTICA: Atualizar TODOS os desafios READ_POST ativos por leitura
-- Antes: Trigger atualizava apenas 1 desafio (maior recompensa) usando LIMIT 1
-- Depois: Loop atualiza TODOS os desafios READ_POST ativos do aluno

CREATE OR REPLACE FUNCTION public.handle_post_read_challenge()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- ✅ NOVO: Iterar sobre TODOS os desafios READ_POST ativos do aluno
  FOR v_challenge IN
    SELECT 
      sc.id AS student_challenge_id,
      c.id AS challenge_id,
      c.title,
      c.koin_reward,
      c.action_count,
      sc.current_progress
    FROM public.student_challenges sc
    JOIN public.challenges c ON sc.challenge_id = c.id
    WHERE sc.student_id = NEW.user_id
      AND c.action_target = 'READ_POST'
      AND sc.status = 'IN_PROGRESS'
  LOOP
    -- Atualizar progresso do desafio
    UPDATE public.student_challenges
    SET 
      current_progress = current_progress + 1,
      updated_at = NOW()
    WHERE id = v_challenge.student_challenge_id;
    
    -- Verificar se completou o desafio
    IF (v_challenge.current_progress + 1) >= v_challenge.action_count THEN
      PERFORM complete_challenge_and_reward(
        NEW.user_id,
        v_challenge.student_challenge_id,
        v_challenge.koin_reward,
        v_challenge.title
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Dropar função existente para recriar com correção
DROP FUNCTION IF EXISTS public.assign_challenge_to_students(uuid);

-- Recriar função corrigida para permitir re-atribuição de DAILY/WEEKLY após completados
CREATE OR REPLACE FUNCTION public.assign_challenge_to_students(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge RECORD;
  v_student_id uuid;
  v_exists boolean;
BEGIN
  -- Buscar dados do desafio
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  
  IF v_challenge IS NULL THEN
    RAISE EXCEPTION 'Desafio não encontrado';
  END IF;

  -- Para cada aluno da escola do desafio (ou global se school_id for null)
  FOR v_student_id IN
    SELECT DISTINCT sm.user_id
    FROM school_memberships sm
    WHERE sm.role = 'aluno'
      AND (v_challenge.school_id IS NULL OR sm.school_id = v_challenge.school_id)
  LOOP
    -- Verificar se já existe assignment baseado no tipo de desafio
    IF v_challenge.type IN ('DAILY', 'WEEKLY') THEN
      -- Para DAILY/WEEKLY: só verificar IN_PROGRESS (permite re-atribuição após COMPLETED)
      SELECT EXISTS(
        SELECT 1 FROM student_challenges
        WHERE student_id = v_student_id
          AND challenge_id = p_challenge_id
          AND status = 'IN_PROGRESS'
      ) INTO v_exists;
    ELSE
      -- ACHIEVEMENT: verificar ambos (nunca re-atribuir conquistas)
      SELECT EXISTS(
        SELECT 1 FROM student_challenges
        WHERE student_id = v_student_id
          AND challenge_id = p_challenge_id
          AND status IN ('IN_PROGRESS', 'COMPLETED')
      ) INTO v_exists;
    END IF;

    -- Criar assignment se não existir
    IF NOT v_exists THEN
      INSERT INTO student_challenges (student_id, challenge_id, status, current_progress, started_at)
      VALUES (v_student_id, p_challenge_id, 'IN_PROGRESS', 0, NOW());
    END IF;
  END LOOP;
END;
$$;

-- Atribuir desafios DAILY/WEEKLY faltantes para todos os alunos
DO $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Para cada desafio DAILY/WEEKLY ativo
  FOR v_challenge IN
    SELECT id FROM challenges 
    WHERE is_active = true 
      AND type IN ('DAILY', 'WEEKLY')
  LOOP
    -- Executar atribuição (a função agora permite re-atribuir após COMPLETED)
    PERFORM assign_challenge_to_students(v_challenge.id);
  END LOOP;
END;
$$;
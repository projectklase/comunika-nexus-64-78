-- CORREÇÃO 1: Atualizar constraint de koin_transactions para incluir EARN_CHALLENGE
ALTER TABLE koin_transactions DROP CONSTRAINT IF EXISTS koin_transactions_type_check;
ALTER TABLE koin_transactions ADD CONSTRAINT koin_transactions_type_check 
  CHECK (type = ANY (ARRAY['TASK_REWARD', 'BONUS', 'REDEMPTION', 'REFUND', 'EARN_CHALLENGE']));

-- CORREÇÃO 3: Criar trigger para atribuir desafios automaticamente a novos alunos
CREATE OR REPLACE FUNCTION public.assign_challenges_to_new_student()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um novo school_membership é criado com role 'aluno', atribuir desafios ativos
  IF NEW.role = 'aluno' THEN
    INSERT INTO student_challenges (student_id, challenge_id, status, expires_at, started_at)
    SELECT 
      NEW.user_id,
      c.id,
      'IN_PROGRESS',
      CASE WHEN c.type = 'DAILY' 
        THEN (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone
        ELSE (date_trunc('week', CURRENT_DATE) + INTERVAL '1 week')::timestamp with time zone
      END,
      NOW()
    FROM challenges c
    WHERE c.is_active = true
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trigger_assign_challenges_new_student ON school_memberships;
CREATE TRIGGER trigger_assign_challenges_new_student
AFTER INSERT ON school_memberships
FOR EACH ROW
EXECUTE FUNCTION assign_challenges_to_new_student();

-- CORREÇÃO 4: Atribuir desafios para alunos existentes sem desafios ativos
INSERT INTO student_challenges (student_id, challenge_id, status, expires_at, started_at)
SELECT 
  sm.user_id,
  c.id,
  'IN_PROGRESS',
  CASE WHEN c.type = 'DAILY' 
    THEN (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone
    ELSE (date_trunc('week', CURRENT_DATE) + INTERVAL '1 week')::timestamp with time zone
  END,
  NOW()
FROM school_memberships sm
CROSS JOIN challenges c
WHERE sm.role = 'aluno'
AND c.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM student_challenges sc 
  WHERE sc.student_id = sm.user_id 
  AND sc.challenge_id = c.id 
  AND sc.status = 'IN_PROGRESS'
)
ON CONFLICT DO NOTHING;
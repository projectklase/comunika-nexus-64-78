-- Corrigir desafio DAILY_CHECKIN com meta > 1 para tipo WEEKLY
-- O trigger exige mínimo 5 ações para WEEKLY, então atualizamos para 5 check-ins semanais

-- 1. Atualizar o tipo e action_count do desafio para WEEKLY com meta 5
UPDATE challenges 
SET 
  type = 'WEEKLY',
  action_count = 5,
  description = 'Faça check-in em 5 dias desta semana!',
  updated_at = NOW()
WHERE action_target = 'DAILY_CHECKIN' 
  AND type = 'DAILY' 
  AND action_count > 1;

-- 2. Resetar progresso dos alunos nos desafios afetados para começar ciclo semanal limpo
UPDATE student_challenges sc
SET 
  current_progress = 0,
  status = 'IN_PROGRESS',
  started_at = NOW(),
  completed_at = NULL,
  updated_at = NOW()
WHERE sc.challenge_id IN (
  SELECT id FROM challenges 
  WHERE action_target = 'DAILY_CHECKIN' 
    AND type = 'WEEKLY'
)
AND sc.status = 'IN_PROGRESS';
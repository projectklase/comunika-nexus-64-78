-- Corrigir transações de Koins sem school_id
-- Atualizar baseando-se no user_id e sua escola via school_memberships

UPDATE koin_transactions kt
SET school_id = (
  SELECT sm.school_id 
  FROM school_memberships sm 
  WHERE sm.user_id = kt.user_id 
  AND sm.role = 'aluno'
  LIMIT 1
)
WHERE kt.school_id IS NULL
AND EXISTS (
  SELECT 1 FROM school_memberships sm 
  WHERE sm.user_id = kt.user_id 
  AND sm.role = 'aluno'
);

-- Criar índice para melhorar performance de queries filtradas por school_id
CREATE INDEX IF NOT EXISTS idx_koin_transactions_school_id 
ON koin_transactions(school_id) 
WHERE school_id IS NOT NULL;
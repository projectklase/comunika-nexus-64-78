-- Limpar notificações duplicadas (manter apenas a mais recente de cada tipo por usuário)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type, title, message 
      ORDER BY created_at DESC
    ) as rn
  FROM notifications
)
DELETE FROM notifications
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Comentário explicativo sobre duplicatas
COMMENT ON TABLE notifications IS 'Tabela de notificações. Evitar criar notificações duplicadas no código de aplicação.';
-- Fase 2.1: Remover coluna status duplicada (usar apenas is_read)
ALTER TABLE notifications DROP COLUMN IF EXISTS status;

-- Fase 2.2: Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read);

-- Fase 2.3: Limpar notificações órfãs com userId inválido
DELETE FROM notifications 
WHERE user_id = '00000000-0000-0000-0000-000000000000'
   OR user_id IS NULL;
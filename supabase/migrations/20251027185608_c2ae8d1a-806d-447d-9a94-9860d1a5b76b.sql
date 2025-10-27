-- Adicionar constraint única para prevenir notificações duplicadas
-- Isso garante que cada usuário receba apenas 1 notificação por evento único
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_key
ON notifications (user_id, ((meta->>'notificationKey')::text))
WHERE meta->>'notificationKey' IS NOT NULL;

-- Limpar notificações duplicadas existentes (mantém a mais antiga)
DELETE FROM notifications a
USING notifications b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.meta->>'postId' = b.meta->>'postId'
  AND a.type = b.type
  AND a.created_at::date = b.created_at::date;
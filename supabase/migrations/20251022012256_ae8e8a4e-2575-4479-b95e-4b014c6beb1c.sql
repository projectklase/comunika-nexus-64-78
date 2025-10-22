
-- Limpar notificações antigas de teste para começar do zero
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '1 hour'
AND type IN ('POST_NEW', 'POST_IMPORTANT');

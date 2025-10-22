-- Limpar notificações antigas criadas incorretamente
-- Essas notificações têm role_target='ALUNO' mas user_id de secretaria, impedindo alunos de vê-las

-- Deletar notificações de posts para ALUNO que têm user_id incorreto
-- (user_id deveria ser de um aluno, não de secretaria/professor)
DELETE FROM notifications
WHERE role_target = 'ALUNO'
  AND type IN ('POST_NEW', 'POST_IMPORTANT')
  AND meta IS NULL; -- Notificações antigas sem metadata

-- Adicionar comentário explicativo
COMMENT ON TABLE notifications IS 
'Notificações do sistema. IMPORTANTE: user_id deve ser o destinatário da notificação, não o criador. role_target filtra por papel, mas user_id identifica o destinatário específico.';
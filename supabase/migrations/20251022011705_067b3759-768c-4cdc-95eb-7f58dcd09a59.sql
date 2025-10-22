-- Limpar notificação criada incorretamente para Secretaria em vez de alunos
DELETE FROM notifications 
WHERE id = 'e935d182-b803-41d4-bece-0cd9cea8471c'
  AND user_id = '48887037-42aa-4b83-ba28-dc1c7725803d'
  AND role_target = 'SECRETARIA'
  AND type = 'POST_IMPORTANT';
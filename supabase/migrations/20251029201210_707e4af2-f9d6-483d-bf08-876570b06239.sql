-- Corrigir author_role dos posts existentes criados por professores
UPDATE posts
SET author_role = 'professor'
WHERE type IN ('ATIVIDADE', 'TRABALHO', 'PROVA')
  AND author_role != 'professor'
  AND author_id IN (
    SELECT user_id 
    FROM user_roles 
    WHERE role = 'professor'
  );

-- Corrigir author_role dos posts existentes criados pela secretaria
UPDATE posts
SET author_role = 'secretaria'
WHERE author_role != 'secretaria'
  AND author_id IN (
    SELECT user_id 
    FROM user_roles 
    WHERE role = 'secretaria'
  );
-- Fase 1: Limpar registro duplicado inválido
DELETE FROM user_roles 
WHERE user_id = 'f905cbb2-30ea-45ae-be68-b85f4f6180d9' 
  AND role = 'aluno';

-- Fase 2: Adicionar UNIQUE constraint para prevenir duplicatas futuras
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_user_id_unique 
UNIQUE (user_id);

-- Validação: Verificar que cada usuário tem apenas 1 role
COMMENT ON CONSTRAINT user_roles_user_id_unique ON user_roles IS 
'Garante que cada usuário tenha apenas uma role por vez, prevenindo erros de autenticação';
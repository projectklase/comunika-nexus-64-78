-- Limpar escolas órfãs existentes (escolas sem nenhum administrador associado)
DELETE FROM schools 
WHERE id NOT IN (
  SELECT DISTINCT school_id 
  FROM school_memberships 
  WHERE role = 'administrador'
);
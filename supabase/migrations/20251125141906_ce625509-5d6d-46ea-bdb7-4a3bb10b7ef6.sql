-- FASE 1: Limpar registros duplicados de secretaria_permissions
-- Manter apenas o registro mais recente para cada combinação secretaria_id + permission_key
DELETE FROM secretaria_permissions sp1
WHERE EXISTS (
  SELECT 1 FROM secretaria_permissions sp2
  WHERE sp2.secretaria_id = sp1.secretaria_id
    AND sp2.permission_key = sp1.permission_key
    AND sp2.granted_at > sp1.granted_at
);

-- FASE 4: Ajustar constraint UNIQUE para permitir upsert correto
-- Remover constraint antiga que incluía school_id
ALTER TABLE secretaria_permissions 
DROP CONSTRAINT IF EXISTS secretaria_permissions_secretaria_id_permission_key_school_id_key;

-- Criar nova constraint sem school_id (apenas secretaria_id + permission_key)
ALTER TABLE secretaria_permissions
ADD CONSTRAINT secretaria_permissions_unique_per_secretaria_key 
UNIQUE(secretaria_id, permission_key);
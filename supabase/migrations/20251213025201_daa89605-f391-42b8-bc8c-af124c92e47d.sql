-- Remover a constraint existente
ALTER TABLE platform_audit_logs 
DROP CONSTRAINT IF EXISTS platform_audit_logs_superadmin_id_fkey;

-- Garantir que superadmin_id pode ser NULL
ALTER TABLE platform_audit_logs 
ALTER COLUMN superadmin_id DROP NOT NULL;

-- Adicionar nova constraint com ON DELETE SET NULL
-- Isso preserva os logs de auditoria mesmo após deletar o superadmin
ALTER TABLE platform_audit_logs 
ADD CONSTRAINT platform_audit_logs_superadmin_id_fkey 
FOREIGN KEY (superadmin_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;
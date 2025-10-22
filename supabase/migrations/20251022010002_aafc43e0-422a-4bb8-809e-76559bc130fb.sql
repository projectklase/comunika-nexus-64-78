-- Remove política antiga que é muito restritiva
DROP POLICY IF EXISTS "Secretaria e sistema podem criar notificações" ON notifications;

-- Nova política: Secretaria e Professor podem criar para qualquer usuário
CREATE POLICY "Usuários autorizados podem criar notificações" 
ON notifications FOR INSERT
TO public
WITH CHECK (
  -- Secretaria pode criar notificações para qualquer usuário
  has_role(auth.uid(), 'secretaria'::app_role) 
  OR 
  -- Professor pode criar notificações para qualquer usuário
  has_role(auth.uid(), 'professor'::app_role)
  OR 
  -- Usuários comuns só podem criar notificações para si mesmos
  auth.uid() = user_id
  OR 
  -- Service role do Supabase pode criar para qualquer um
  auth.role() = 'service_role'
);

-- Adicionar comentário explicativo
COMMENT ON POLICY "Usuários autorizados podem criar notificações" ON notifications IS 
'Permite que secretaria e professores criem notificações para qualquer usuário (necessário para posts importantes). Usuários comuns só podem criar notificações para si mesmos.';
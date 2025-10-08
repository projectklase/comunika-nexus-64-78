-- Corrigir RLS policies de notificações para verificar user_id corretamente

-- Drop das políticas existentes
DROP POLICY IF EXISTS "Sistema pode criar notificações" ON notifications;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias notificações" ON notifications;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias notificações" ON notifications;

-- Recriar políticas corretas

-- SELECT: Usuários só podem ver suas próprias notificações
CREATE POLICY "Usuários podem ver suas próprias notificações"
ON notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Sistema pode criar (sem verificação de user no WITH CHECK para permitir sistema criar)
CREATE POLICY "Sistema pode criar notificações"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Usuários só podem atualizar suas próprias notificações
CREATE POLICY "Usuários podem atualizar suas próprias notificações"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Comentário
COMMENT ON TABLE notifications IS 'Tabela de notificações com RLS policies que verificam user_id';
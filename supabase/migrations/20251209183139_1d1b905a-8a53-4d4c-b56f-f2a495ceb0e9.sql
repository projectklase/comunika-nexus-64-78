-- CORREÇÃO DE SEGURANÇA URGENTE
-- Remover policy permissiva que permite INSERT com WITH CHECK (true) na tabela audit_events
-- Esta policy permitia que qualquer usuário autenticado inserisse eventos de auditoria falsos

DROP POLICY IF EXISTS "Permitir inserção de novos eventos de auditoria" ON audit_events;
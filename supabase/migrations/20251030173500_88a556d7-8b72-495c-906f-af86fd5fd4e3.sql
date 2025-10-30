-- ============================================================================
-- MIGRAÇÃO: Adicionar role 'administrador' ao sistema
-- RISK LEVEL: MEDIUM (Modifica ENUM de roles)
-- ROLLBACK: Não há rollback automático para ALTER TYPE ADD VALUE
-- ============================================================================

-- Adiciona o novo valor 'administrador' ao ENUM de roles
-- NOTA: Esta operação é irreversível sem recriar o ENUM
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrador';

-- Validação: Verificar se o valor foi adicionado
-- Execute após a migração: SELECT unnest(enum_range(NULL::app_role));
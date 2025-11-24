-- ============================================================================
-- MIGRATION: Correção Final das 2 Últimas Funções
-- Data: 2025-01-24
-- Descrição: Corrige search_path das funções cleanup_old_system_logs e update_feature_flags_updated_at
-- ============================================================================

-- Corrigir função cleanup_old_system_logs
ALTER FUNCTION public.cleanup_old_system_logs(days_to_keep integer) 
SET search_path = 'public';

-- Corrigir função update_feature_flags_updated_at (trigger function)
ALTER FUNCTION public.update_feature_flags_updated_at() 
SET search_path = 'public';

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ MIGRATION COMPLETA: Últimas 2 funções corrigidas';
  RAISE NOTICE '✅ cleanup_old_system_logs: search_path definido';
  RAISE NOTICE '✅ update_feature_flags_updated_at: search_path definido';
  RAISE NOTICE '🔒 TOTAL: Todas as funções SECURITY DEFINER agora estão protegidas';
END $$;
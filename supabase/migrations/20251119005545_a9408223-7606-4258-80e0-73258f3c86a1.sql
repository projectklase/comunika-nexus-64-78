-- ============================================
-- REMOVER AMBIGUIDADE DE FUNÇÕES RPC
-- Dropar versões antigas sem school_id_param
-- ============================================

-- Remover versão antiga de get_evasion_risk_analytics (apenas days_filter)
DROP FUNCTION IF EXISTS public.get_evasion_risk_analytics(days_filter integer);

-- Remover versão antiga de get_post_read_analytics (apenas days_filter)
DROP FUNCTION IF EXISTS public.get_post_read_analytics(days_filter integer);

-- Remover qualquer versão antiga de get_class_performance_analytics
DROP FUNCTION IF EXISTS public.get_class_performance_analytics(uuid, integer);

-- As versões corretas com school_id_param já existem e serão mantidas:
-- ✅ get_evasion_risk_analytics(days_filter integer DEFAULT 30, school_id_param uuid DEFAULT NULL)
-- ✅ get_post_read_analytics(days_filter integer DEFAULT 30, school_id_param uuid DEFAULT NULL)
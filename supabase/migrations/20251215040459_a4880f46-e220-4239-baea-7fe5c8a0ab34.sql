-- Remover funções duplicadas de get_evasion_risk_analytics
DROP FUNCTION IF EXISTS public.get_evasion_risk_analytics(integer, uuid);
DROP FUNCTION IF EXISTS public.get_evasion_risk_analytics(uuid, integer);
-- ============================================================================
-- MIGRATION: Correção search_path Funções Restantes
-- Data: 2025-01-24
-- Descrição: Corrige search_path mutável em funções SECURITY DEFINER restantes
-- ============================================================================

-- Corrigir todas as funções SECURITY DEFINER que ainda não têm search_path definido

ALTER FUNCTION public.get_class_performance_analytics(uuid, integer) 
SET search_path = 'public';

ALTER FUNCTION public.has_role(uuid, app_role) 
SET search_path = 'public';

ALTER FUNCTION public.user_has_school_access(uuid, uuid) 
SET search_path = 'public';

ALTER FUNCTION public.can_create_notifications(uuid) 
SET search_path = 'public';

ALTER FUNCTION public.get_user_role(uuid) 
SET search_path = 'public';

ALTER FUNCTION public.grant_koin_bonus(text, text, integer, uuid[], uuid) 
SET search_path = 'public';

ALTER FUNCTION public.request_redemption(uuid, uuid) 
SET search_path = 'public';

ALTER FUNCTION public.approve_redemption(uuid, uuid) 
SET search_path = 'public';

ALTER FUNCTION public.reject_redemption(uuid, uuid, text) 
SET search_path = 'public';

ALTER FUNCTION public.get_student_challenges_with_progress(uuid) 
SET search_path = 'public';

ALTER FUNCTION public.complete_challenge_and_reward(uuid, uuid, integer, text) 
SET search_path = 'public';

ALTER FUNCTION public.add_koins_to_user(uuid, integer) 
SET search_path = 'public';

ALTER FUNCTION public.assign_challenge_to_students(uuid) 
SET search_path = 'public';

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ MIGRATION COMPLETA: search_path corrigido em todas as funções SECURITY DEFINER';
END $$;
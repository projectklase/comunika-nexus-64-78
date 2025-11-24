-- ============================================================================
-- MIGRATION: Correção Final search_path (Assinaturas Exatas)
-- Data: 2025-01-24
-- Descrição: Corrige search_path com assinaturas exatas das funções
-- ============================================================================

-- Corrigir funções com assinaturas exatas descobertas

ALTER FUNCTION public.add_koins_to_user(user_id_in uuid, amount_in integer) 
SET search_path = 'public';

ALTER FUNCTION public.approve_redemption(p_redemption_id uuid, p_admin_id uuid) 
SET search_path = 'public';

ALTER FUNCTION public.assign_challenge_to_students(p_challenge_id uuid) 
SET search_path = 'public';

ALTER FUNCTION public.can_create_notifications(_user_id uuid) 
SET search_path = 'public';

ALTER FUNCTION public.complete_challenge_and_reward(p_student_id uuid, p_student_challenge_id uuid, p_koin_reward integer, p_challenge_title text) 
SET search_path = 'public';

ALTER FUNCTION public.get_class_performance_analytics(p_class_id uuid, days_filter integer) 
SET search_path = 'public';

ALTER FUNCTION public.get_evasion_risk_analytics(days_filter integer, school_id_param uuid) 
SET search_path = 'public';

ALTER FUNCTION public.get_family_metrics(school_id_param uuid) 
SET search_path = 'public';

ALTER FUNCTION public.get_post_read_analytics(days_filter integer, school_id_param uuid) 
SET search_path = 'public';

ALTER FUNCTION public.get_student_challenges_with_progress(p_student_id uuid) 
SET search_path = 'public';

ALTER FUNCTION public.get_user_role(_user_id uuid) 
SET search_path = 'public';

ALTER FUNCTION public.grant_koin_bonus(p_event_name text, p_event_description text, p_koin_amount integer, p_student_ids uuid[], p_granted_by uuid) 
SET search_path = 'public';

ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) 
SET search_path = 'public';

ALTER FUNCTION public.reject_redemption(p_redemption_id uuid, p_admin_id uuid, p_reason text) 
SET search_path = 'public';

ALTER FUNCTION public.request_redemption(p_student_id uuid, p_item_id uuid) 
SET search_path = 'public';

ALTER FUNCTION public.user_has_school_access(_user_id uuid, _school_id uuid) 
SET search_path = 'public';

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ MIGRATION COMPLETA: search_path corrigido com assinaturas exatas';
  RAISE NOTICE '✅ Total de 16 funções SECURITY DEFINER protegidas contra SQL injection';
END $$;
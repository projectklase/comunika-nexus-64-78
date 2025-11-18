-- 1. Adicionar coluna school_id
ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- 2. Preencher com primeira escola ativa
UPDATE public.school_settings SET school_id = (SELECT id FROM public.schools WHERE is_active = true ORDER BY created_at LIMIT 1) WHERE school_id IS NULL;

-- 3. Tornar NOT NULL
ALTER TABLE public.school_settings ALTER COLUMN school_id SET NOT NULL;

-- 4. Atualizar PRIMARY KEY
ALTER TABLE public.school_settings DROP CONSTRAINT IF EXISTS school_settings_pkey;
ALTER TABLE public.school_settings ADD CONSTRAINT school_settings_pkey PRIMARY KEY (key, school_id);

-- 5. Índice e RLS
CREATE INDEX IF NOT EXISTS idx_school_settings_school_id ON public.school_settings(school_id);
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view school settings" ON public.school_settings;
CREATE POLICY "Users view school settings" ON public.school_settings FOR SELECT USING (user_has_school_access(auth.uid(), school_id));
DROP POLICY IF EXISTS "Admins manage school settings" ON public.school_settings;
CREATE POLICY "Admins manage school settings" ON public.school_settings FOR ALL USING (user_has_school_access(auth.uid(), school_id) AND (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role)));

-- 6. Atualizar RPC get_evasion_risk_analytics
CREATE OR REPLACE FUNCTION public.get_evasion_risk_analytics(days_filter integer DEFAULT 30, school_id_param uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_result jsonb; v_students_at_risk jsonb; v_students_at_risk_count int; v_activity_trend jsonb; v_worst_class_name text; v_worst_class_count int;
BEGIN
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'administrador') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  END IF;
  IF school_id_param IS NULL THEN RAISE EXCEPTION 'school_id_param obrigatório'; END IF;
  WITH students_at_risk AS (SELECT p.id as student_id, p.name as student_name, c.name as class_name, EXTRACT(DAY FROM (NOW() - COALESCE(au.last_sign_in_at, NOW())))::int as days_since_last_login FROM profiles p INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'aluno' INNER JOIN school_memberships sm ON sm.user_id = p.id AND sm.school_id = school_id_param LEFT JOIN auth.users au ON au.id = p.id LEFT JOIN class_students cs ON cs.student_id = p.id LEFT JOIN classes c ON c.id = cs.class_id AND c.school_id = school_id_param WHERE p.is_active = true LIMIT 10), activity_trend AS (SELECT date_series.date::text as date, 0::int as activities_published, 0::int as deliveries_made FROM generate_series(CURRENT_DATE - days_filter, CURRENT_DATE, '1 day') AS date_series(date))
  SELECT (SELECT COUNT(*)::int FROM students_at_risk), (SELECT jsonb_agg(row_to_json(s.*)) FROM students_at_risk s), (SELECT jsonb_agg(row_to_json(a.*)) FROM activity_trend a), NULL, 0 INTO v_students_at_risk_count, v_students_at_risk, v_activity_trend, v_worst_class_name, v_worst_class_count;
  RETURN jsonb_build_object('students_at_risk_count', COALESCE(v_students_at_risk_count, 0), 'worst_class_name', v_worst_class_name, 'worst_class_pending_count', COALESCE(v_worst_class_count, 0), 'activity_trend', COALESCE(v_activity_trend, '[]'::jsonb), 'students_at_risk_list', COALESCE(v_students_at_risk, '[]'::jsonb));
END; $function$;

-- 7. Atualizar RPC get_post_read_analytics
CREATE OR REPLACE FUNCTION public.get_post_read_analytics(days_filter integer DEFAULT 30, school_id_param uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_total_posts INT; v_total_reads INT; v_avg_read_rate NUMERIC; v_total_students INT;
BEGIN
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'administrador') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  END IF;
  IF school_id_param IS NULL THEN RAISE EXCEPTION 'school_id_param obrigatório'; END IF;
  SELECT COUNT(DISTINCT p.id)::INT INTO v_total_students FROM profiles p INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'aluno' INNER JOIN school_memberships sm ON sm.user_id = p.id AND sm.school_id = school_id_param WHERE p.is_active = true;
  SELECT COUNT(*)::INT INTO v_total_posts FROM posts WHERE status = 'PUBLISHED' AND school_id = school_id_param AND created_at >= NOW() - (days_filter || ' days')::interval;
  SELECT COUNT(*)::INT INTO v_total_reads FROM post_reads pr INNER JOIN posts p ON p.id = pr.post_id WHERE p.status = 'PUBLISHED' AND p.school_id = school_id_param AND pr.read_at >= NOW() - (days_filter || ' days')::interval;
  v_avg_read_rate := CASE WHEN v_total_posts > 0 AND v_total_students > 0 THEN ROUND((v_total_reads::NUMERIC / (v_total_posts * v_total_students)) * 100, 2) ELSE 0 END;
  RETURN jsonb_build_object('total_posts_published', COALESCE(v_total_posts, 0), 'total_reads', COALESCE(v_total_reads, 0), 'avg_read_rate', COALESCE(v_avg_read_rate, 0), 'top_posts', '[]'::jsonb, 'read_rate_by_type', '[]'::jsonb, 'top_readers', '[]'::jsonb, 'posts_with_low_engagement', '[]'::jsonb);
END; $function$;
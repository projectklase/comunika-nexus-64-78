-- ============================================================
-- RECRIAR: get_class_performance_analytics
-- Função foi removida acidentalmente, recriando
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_class_performance_analytics(
  p_class_id UUID,
  days_filter INTEGER DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_class_name text;
  v_total_students int;
  v_active_students int;
  v_total_activities int;
  v_total_deliveries int;
  v_delivery_rate numeric;
  v_avg_days_to_deliver numeric;
  v_pending_deliveries int;
  v_approved_deliveries int;
  v_returned_deliveries int;
  v_late_deliveries int;
BEGIN
  -- ✅ VALIDAÇÃO DE SEGURANÇA
  SELECT ur.role::text INTO v_caller_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
  
  IF v_caller_role IS NULL OR v_caller_role != 'administrador' THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar analytics'
      USING HINT = 'Você precisa ter o role "administrador" para chamar esta função';
  END IF;

  -- ✅ VALIDAÇÃO DE INPUT
  IF p_class_id IS NULL THEN
    RAISE EXCEPTION 'class_id não pode ser nulo';
  END IF;

  -- Buscar nome da turma
  SELECT name INTO v_class_name
  FROM public.classes
  WHERE id = p_class_id;

  IF v_class_name IS NULL THEN
    RAISE EXCEPTION 'Turma não encontrada';
  END IF;

  -- Total de alunos na turma
  SELECT COUNT(DISTINCT cs.student_id)::int INTO v_total_students
  FROM public.class_students cs
  WHERE cs.class_id = p_class_id;

  -- Alunos ativos (com login nos últimos 7 dias)
  SELECT COUNT(DISTINCT cs.student_id)::int INTO v_active_students
  FROM public.class_students cs
  INNER JOIN auth.users au ON au.id = cs.student_id
  WHERE cs.class_id = p_class_id
    AND au.last_sign_in_at >= (NOW() - INTERVAL '7 days');

  -- Total de atividades atribuídas à turma no período
  SELECT COUNT(DISTINCT p.id)::int INTO v_total_activities
  FROM public.posts p
  WHERE p.type IN ('ATIVIDADE', 'TRABALHO', 'PROVA')
    AND p.status = 'PUBLISHED'
    AND p.class_id::uuid = p_class_id
    AND p.created_at >= (NOW() - days_filter * INTERVAL '1 day');

  -- Total de entregas no período
  SELECT COUNT(*)::int INTO v_total_deliveries
  FROM public.deliveries d
  WHERE d.class_id::uuid = p_class_id
    AND d.submitted_at >= (NOW() - days_filter * INTERVAL '1 day');

  -- Taxa de entrega (entregas / (atividades * alunos))
  IF v_total_activities > 0 AND v_total_students > 0 THEN
    v_delivery_rate := ROUND((v_total_deliveries::numeric / (v_total_activities * v_total_students)::numeric) * 100, 2);
  ELSE
    v_delivery_rate := 0;
  END IF;

  -- Média de dias para entrega
  SELECT ROUND(AVG(EXTRACT(DAY FROM (d.submitted_at - p.created_at)))::numeric, 1) INTO v_avg_days_to_deliver
  FROM public.deliveries d
  INNER JOIN public.posts p ON p.id::text = d.post_id
  WHERE d.class_id::uuid = p_class_id
    AND d.submitted_at >= (NOW() - days_filter * INTERVAL '1 day');

  -- Entregas pendentes
  SELECT COUNT(*)::int INTO v_pending_deliveries
  FROM public.deliveries d
  WHERE d.class_id::uuid = p_class_id
    AND d.review_status = 'AGUARDANDO';

  -- Entregas aprovadas
  SELECT COUNT(*)::int INTO v_approved_deliveries
  FROM public.deliveries d
  WHERE d.class_id::uuid = p_class_id
    AND d.review_status = 'APROVADA'
    AND d.submitted_at >= (NOW() - days_filter * INTERVAL '1 day');

  -- Entregas devolvidas
  SELECT COUNT(*)::int INTO v_returned_deliveries
  FROM public.deliveries d
  WHERE d.class_id::uuid = p_class_id
    AND d.review_status = 'DEVOLVIDA'
    AND d.submitted_at >= (NOW() - days_filter * INTERVAL '1 day');

  -- Entregas atrasadas
  SELECT COUNT(*)::int INTO v_late_deliveries
  FROM public.deliveries d
  WHERE d.class_id::uuid = p_class_id
    AND d.is_late = true
    AND d.submitted_at >= (NOW() - days_filter * INTERVAL '1 day');

  -- Montar JSON de resposta
  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'class_name', v_class_name,
    'total_students', COALESCE(v_total_students, 0),
    'active_students_last_7_days', COALESCE(v_active_students, 0),
    'total_activities_assigned', COALESCE(v_total_activities, 0),
    'total_deliveries', COALESCE(v_total_deliveries, 0),
    'delivery_rate', COALESCE(v_delivery_rate, 0),
    'avg_days_to_deliver', v_avg_days_to_deliver,
    'pending_deliveries', COALESCE(v_pending_deliveries, 0),
    'approved_deliveries', COALESCE(v_approved_deliveries, 0),
    'returned_deliveries', COALESCE(v_returned_deliveries, 0),
    'late_deliveries', COALESCE(v_late_deliveries, 0)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao processar analytics da turma: %', SQLERRM
      USING HINT = 'Verifique os logs do servidor para mais detalhes';
END;
$$;

-- ✅ Permissões
REVOKE EXECUTE ON FUNCTION public.get_class_performance_analytics(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_class_performance_analytics(UUID, INTEGER) TO authenticated;

-- ✅ Comentário
COMMENT ON FUNCTION public.get_class_performance_analytics(UUID, INTEGER) IS 
'Retorna métricas de performance agregadas de uma turma. Apenas administradores podem chamar esta função.';
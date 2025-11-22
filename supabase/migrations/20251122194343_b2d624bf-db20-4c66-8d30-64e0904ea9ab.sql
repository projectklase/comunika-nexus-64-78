-- Fix audit events for redemption requests to include complete actor information

-- ============================================================================
-- 1. Fix request_redemption function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_redemption(p_student_id uuid, p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  item_price INTEGER;
  item_stock INTEGER;
  student_balance INTEGER;
  new_redemption_id UUID;
  new_transaction_id UUID;
  v_actor_name TEXT;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_school_id UUID;
BEGIN
  -- Validações com FOR UPDATE SKIP LOCKED para evitar race conditions
  SELECT price_koins, stock INTO item_price, item_stock 
  FROM public.reward_items 
  WHERE id = p_item_id 
  FOR UPDATE SKIP LOCKED;
  
  SELECT koins INTO student_balance 
  FROM public.profiles 
  WHERE id = p_student_id 
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Item ou estudante não encontrado'; 
  END IF;
  
  IF item_stock <= 0 THEN 
    RAISE EXCEPTION 'Item esgotado'; 
  END IF;
  
  IF student_balance < item_price THEN 
    RAISE EXCEPTION 'Saldo de Koins insuficiente'; 
  END IF;

  -- Buscar informações do aluno para auditoria
  SELECT p.name, p.email, ur.role::text, p.current_school_id
  INTO v_actor_name, v_actor_email, v_actor_role, v_school_id
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.id = p_student_id;

  -- Criar resgate ANTES da transação para ter o ID
  INSERT INTO public.redemption_requests (student_id, item_id, status, requested_at, school_id)
  VALUES (p_student_id, p_item_id, 'PENDING', now(), v_school_id)
  RETURNING id INTO new_redemption_id;

  -- Criar transação com related_entity_id apontando para o resgate E balance_before/after
  INSERT INTO public.koin_transactions (
    user_id, 
    amount, 
    type, 
    description, 
    related_entity_id,
    balance_before,
    balance_after,
    school_id
  )
  VALUES (
    p_student_id, 
    -item_price, 
    'REDEMPTION', 
    (SELECT name FROM reward_items WHERE id = p_item_id), 
    new_redemption_id,
    student_balance,
    student_balance - item_price,
    v_school_id
  )
  RETURNING id INTO new_transaction_id;

  -- Atualizar redemption_request com o ID da transação
  UPDATE public.redemption_requests 
  SET debit_transaction_id = new_transaction_id
  WHERE id = new_redemption_id;

  -- Descontar Koins do perfil
  UPDATE public.profiles 
  SET koins = koins - item_price 
  WHERE id = p_student_id;

  -- Log de auditoria COM DADOS COMPLETOS DO ATOR
  INSERT INTO public.audit_events (
    actor_id,
    actor_name,
    actor_email,
    actor_role,
    school_id,
    action,
    entity,
    entity_id,
    entity_label,
    meta
  ) VALUES (
    p_student_id,
    COALESCE(v_actor_name, 'Usuário Desconhecido'),
    COALESCE(v_actor_email, ''),
    COALESCE(v_actor_role, 'unknown'),
    v_school_id,
    'REQUEST_REDEMPTION',
    'redemption_requests',
    new_redemption_id::text,
    (SELECT name FROM reward_items WHERE id = p_item_id),
    jsonb_build_object(
      'item_id', p_item_id,
      'amount', item_price,
      'balance_before', student_balance,
      'balance_after', student_balance - item_price
    )
  );
END;
$function$;

-- ============================================================================
-- 2. Fix approve_redemption function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_redemption(p_redemption_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_item_id UUID;
  v_student_id UUID;
  v_status TEXT;
  v_item_name TEXT;
  v_actor_name TEXT;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_school_id UUID;
BEGIN
  -- Buscar informações do resgate com lock
  SELECT item_id, student_id, status, (SELECT name FROM reward_items WHERE id = item_id)
  INTO v_item_id, v_student_id, v_status, v_item_name
  FROM public.redemption_requests 
  WHERE id = p_redemption_id 
  FOR UPDATE SKIP LOCKED;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Resgate não encontrado';
  END IF;
  
  IF v_status != 'PENDING' THEN 
    RAISE EXCEPTION 'Este resgate já foi processado.'; 
  END IF;

  -- Buscar informações do admin para auditoria
  SELECT p.name, p.email, ur.role::text, p.current_school_id
  INTO v_actor_name, v_actor_email, v_actor_role, v_school_id
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.id = p_admin_id;

  -- Reduzir estoque
  UPDATE public.reward_items 
  SET stock = stock - 1 
  WHERE id = v_item_id;

  -- Atualizar status do resgate
  UPDATE public.redemption_requests 
  SET 
    status = 'APPROVED', 
    processed_by = p_admin_id, 
    processed_at = now() 
  WHERE id = p_redemption_id;

  -- Log de auditoria COM DADOS COMPLETOS DO ATOR
  INSERT INTO public.audit_events (
    actor_id,
    actor_name,
    actor_email,
    actor_role,
    school_id,
    action,
    entity,
    entity_id,
    entity_label,
    meta
  ) VALUES (
    p_admin_id,
    COALESCE(v_actor_name, 'Usuário Desconhecido'),
    COALESCE(v_actor_email, ''),
    COALESCE(v_actor_role, 'unknown'),
    v_school_id,
    'APPROVE_REDEMPTION',
    'redemption_requests',
    p_redemption_id::text,
    v_item_name,
    jsonb_build_object(
      'student_id', v_student_id,
      'item_id', v_item_id
    )
  );
END;
$function$;

-- ============================================================================
-- 3. Fix reject_redemption function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reject_redemption(p_redemption_id uuid, p_admin_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_student_id UUID;
  v_debit_tx_id UUID;
  v_amount INTEGER;
  v_item_name TEXT;
  v_status TEXT;
  v_student_balance INTEGER;
  v_actor_name TEXT;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_school_id UUID;
BEGIN
  -- Buscar informações do resgate com lock
  SELECT 
    student_id, 
    debit_transaction_id, 
    status, 
    (SELECT name FROM reward_items WHERE id = item_id)
  INTO v_student_id, v_debit_tx_id, v_status, v_item_name
  FROM public.redemption_requests 
  WHERE id = p_redemption_id 
  FOR UPDATE SKIP LOCKED;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Resgate não encontrado';
  END IF;

  IF v_status != 'PENDING' THEN 
    RAISE EXCEPTION 'Este resgate já foi processado.'; 
  END IF;

  -- Buscar informações do admin para auditoria
  SELECT p.name, p.email, ur.role::text, p.current_school_id
  INTO v_actor_name, v_actor_email, v_actor_role, v_school_id
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.id = p_admin_id;

  -- Buscar valor da transação original
  SELECT amount INTO v_amount 
  FROM public.koin_transactions 
  WHERE id = v_debit_tx_id;

  -- Buscar saldo atual do estudante
  SELECT koins INTO v_student_balance
  FROM public.profiles
  WHERE id = v_student_id;

  -- Reembolsar Koins
  UPDATE public.profiles 
  SET koins = koins + abs(v_amount)
  WHERE id = v_student_id;

  -- Criar transação de REFUND com related_entity_id apontando para o resgate
  INSERT INTO public.koin_transactions (
    user_id, 
    amount, 
    type, 
    description, 
    related_entity_id, 
    processed_by,
    balance_before,
    balance_after,
    school_id
  )
  VALUES (
    v_student_id, 
    abs(v_amount), 
    'REFUND', 
    'Estorno: ' || v_item_name || ' - ' || p_reason, 
    p_redemption_id, 
    p_admin_id,
    v_student_balance,
    v_student_balance + abs(v_amount),
    v_school_id
  );

  -- Atualizar status do resgate com motivo
  UPDATE public.redemption_requests 
  SET 
    status = 'REJECTED', 
    processed_by = p_admin_id, 
    processed_at = now(),
    rejection_reason = p_reason
  WHERE id = p_redemption_id;

  -- Log de auditoria COM DADOS COMPLETOS DO ATOR
  INSERT INTO public.audit_events (
    actor_id,
    actor_name,
    actor_email,
    actor_role,
    school_id,
    action,
    entity,
    entity_id,
    entity_label,
    meta
  ) VALUES (
    p_admin_id,
    COALESCE(v_actor_name, 'Usuário Desconhecido'),
    COALESCE(v_actor_email, ''),
    COALESCE(v_actor_role, 'unknown'),
    v_school_id,
    'REJECT_REDEMPTION',
    'redemption_requests',
    p_redemption_id::text,
    v_item_name,
    jsonb_build_object(
      'student_id', v_student_id,
      'reason', p_reason,
      'refund_amount', abs(v_amount)
    )
  );
END;
$function$;
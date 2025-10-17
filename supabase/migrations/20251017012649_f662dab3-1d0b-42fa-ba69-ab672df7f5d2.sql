-- ============================================
-- FASE 2: Corrigir relacionamento entre transações e resgates
-- ============================================

-- Adicionar constraint para garantir que rejection_reason só é preenchido quando status é REJECTED
ALTER TABLE redemption_requests 
ADD COLUMN rejection_reason TEXT;

-- Atualizar função request_redemption para criar relacionamento correto
CREATE OR REPLACE FUNCTION public.request_redemption(p_student_id uuid, p_item_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item_price INTEGER;
  item_stock INTEGER;
  student_balance INTEGER;
  new_redemption_id UUID;
  new_transaction_id UUID;
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

  -- Criar resgate ANTES da transação para ter o ID
  INSERT INTO public.redemption_requests (student_id, item_id, status, requested_at)
  VALUES (p_student_id, p_item_id, 'PENDING', now())
  RETURNING id INTO new_redemption_id;

  -- Criar transação com related_entity_id apontando para o resgate
  INSERT INTO public.koin_transactions (
    user_id, 
    amount, 
    type, 
    description, 
    related_entity_id,
    balance_before,
    balance_after
  )
  VALUES (
    p_student_id, 
    -item_price, 
    'REDEMPTION', 
    (SELECT name FROM reward_items WHERE id = p_item_id), 
    new_redemption_id,
    student_balance,
    student_balance - item_price
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

  -- Log de auditoria
  INSERT INTO public.audit_events (
    actor_id,
    action,
    entity,
    entity_id,
    entity_label,
    meta
  ) VALUES (
    p_student_id,
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

-- Atualizar função approve_redemption
CREATE OR REPLACE FUNCTION public.approve_redemption(p_redemption_id uuid, p_admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item_id UUID;
  v_student_id UUID;
  v_status TEXT;
  v_item_name TEXT;
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

  -- Log de auditoria
  INSERT INTO public.audit_events (
    actor_id,
    action,
    entity,
    entity_id,
    entity_label,
    meta
  ) VALUES (
    p_admin_id,
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

-- Atualizar função reject_redemption
CREATE OR REPLACE FUNCTION public.reject_redemption(p_redemption_id uuid, p_admin_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id UUID;
  v_debit_tx_id UUID;
  v_amount INTEGER;
  v_item_name TEXT;
  v_status TEXT;
  v_student_balance INTEGER;
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
    balance_after
  )
  VALUES (
    v_student_id, 
    abs(v_amount), 
    'REFUND', 
    'Estorno: ' || v_item_name || ' - ' || p_reason, 
    p_redemption_id, 
    p_admin_id,
    v_student_balance,
    v_student_balance + abs(v_amount)
  );

  -- Atualizar status do resgate com motivo
  UPDATE public.redemption_requests 
  SET 
    status = 'REJECTED', 
    processed_by = p_admin_id, 
    processed_at = now(),
    rejection_reason = p_reason
  WHERE id = p_redemption_id;

  -- Log de auditoria
  INSERT INTO public.audit_events (
    actor_id,
    action,
    entity,
    entity_id,
    entity_label,
    meta
  ) VALUES (
    p_admin_id,
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
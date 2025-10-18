-- FASE 1: Corrigir Schema do Banco (CRÍTICO)

-- 1.1: Adicionar colunas balance_before e balance_after na tabela koin_transactions
ALTER TABLE public.koin_transactions
ADD COLUMN IF NOT EXISTS balance_before INTEGER,
ADD COLUMN IF NOT EXISTS balance_after INTEGER;

-- 1.2: Adicionar comentários para documentação
COMMENT ON COLUMN public.koin_transactions.balance_before IS 'Saldo do usuário antes da transação';
COMMENT ON COLUMN public.koin_transactions.balance_after IS 'Saldo do usuário após a transação';

-- 1.3: Criar índice único parcial para prevenir duplas solicitações pendentes
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_redemption 
ON public.redemption_requests(student_id, item_id) 
WHERE status = 'PENDING';

-- 1.4: Adicionar índices de performance
CREATE INDEX IF NOT EXISTS idx_koin_transactions_user_type 
ON public.koin_transactions(user_id, type);

CREATE INDEX IF NOT EXISTS idx_koin_transactions_related_entity 
ON public.koin_transactions(related_entity_id) 
WHERE related_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_redemption_requests_status 
ON public.redemption_requests(status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_redemption_requests_student 
ON public.redemption_requests(student_id, status);

-- 1.5: Atualizar a função request_redemption para usar as novas colunas corretamente
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

  -- Criar transação com related_entity_id apontando para o resgate E balance_before/after
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
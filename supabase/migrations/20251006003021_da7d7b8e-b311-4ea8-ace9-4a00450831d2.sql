-- Adicionar search_path nas funções que faltam para evitar warnings de segurança

-- Função add_koins_to_user
CREATE OR REPLACE FUNCTION public.add_koins_to_user(user_id_in uuid, amount_in integer)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    UPDATE public.profiles
    SET koins = koins + amount_in
    WHERE id = user_id_in
    RETURNING *;
END;
$$;

-- Função request_redemption
CREATE OR REPLACE FUNCTION public.request_redemption(p_student_id uuid, p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_price INTEGER;
  item_stock INTEGER;
  student_balance INTEGER;
  new_transaction_id UUID;
BEGIN
  SELECT price_koins, stock INTO item_price, item_stock FROM public.reward_items WHERE id = p_item_id FOR UPDATE;
  SELECT koins INTO student_balance FROM public.profiles WHERE id = p_student_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Item ou estudante não encontrado'; END IF;
  IF item_stock <= 0 THEN RAISE EXCEPTION 'Item esgotado'; END IF;
  IF student_balance < item_price THEN RAISE EXCEPTION 'Saldo de Koins insuficiente'; END IF;

  UPDATE public.profiles SET koins = koins - item_price WHERE id = p_student_id;

  INSERT INTO public.koin_transactions (user_id, amount, type, description, related_entity_id)
  VALUES (p_student_id, -item_price, 'REDEMPTION', (SELECT name FROM reward_items WHERE id = p_item_id), p_item_id)
  RETURNING id INTO new_transaction_id;

  INSERT INTO public.redemption_requests (student_id, item_id, status, debit_transaction_id)
  VALUES (p_student_id, p_item_id, 'PENDING', new_transaction_id);
END;
$$;

-- Função approve_redemption
CREATE OR REPLACE FUNCTION public.approve_redemption(p_redemption_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id UUID;
  v_status TEXT;
BEGIN
  SELECT item_id, status INTO v_item_id, v_status FROM public.redemption_requests WHERE id = p_redemption_id FOR UPDATE;
  IF v_status != 'PENDING' THEN RAISE EXCEPTION 'Este resgate já foi processado.'; END IF;

  UPDATE public.reward_items SET stock = stock - 1 WHERE id = v_item_id;

  UPDATE public.redemption_requests SET status = 'APPROVED', processed_by = p_admin_id, processed_at = now() WHERE id = p_redemption_id;
END;
$$;

-- Função reject_redemption
CREATE OR REPLACE FUNCTION public.reject_redemption(p_redemption_id uuid, p_admin_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_debit_tx_id UUID;
  v_amount INTEGER;
  v_item_name TEXT;
  v_status TEXT;
BEGIN
  SELECT student_id, debit_transaction_id, status, (SELECT name FROM reward_items WHERE id = item_id)
  INTO v_student_id, v_debit_tx_id, v_status, v_item_name
  FROM public.redemption_requests WHERE id = p_redemption_id FOR UPDATE;

  IF v_status != 'PENDING' THEN RAISE EXCEPTION 'Este resgate já foi processado.'; END IF;

  SELECT amount INTO v_amount FROM public.koin_transactions WHERE id = v_debit_tx_id;

  PERFORM public.add_koins_to_user(v_student_id, abs(v_amount));

  INSERT INTO public.koin_transactions (user_id, amount, type, description, related_entity_id, processed_by)
  VALUES (v_student_id, abs(v_amount), 'REFUND', 'Estorno: ' || v_item_name || ' - ' || p_reason, p_redemption_id, p_admin_id);

  UPDATE public.redemption_requests SET status = 'REJECTED', processed_by = p_admin_id, processed_at = now() WHERE id = p_redemption_id;
END;
$$;
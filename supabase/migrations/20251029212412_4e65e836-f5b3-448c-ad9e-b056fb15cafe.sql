-- Fix grant_koin_bonus function to use NULL for related_entity_id
-- since BONUS transactions are not tied to redemption requests

CREATE OR REPLACE FUNCTION public.grant_koin_bonus(
  p_event_name text, 
  p_event_description text, 
  p_koin_amount integer, 
  p_student_ids uuid[], 
  p_granted_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id UUID;
  v_student_balance INTEGER;
BEGIN
  -- Validações básicas
  IF p_koin_amount <= 0 THEN
    RAISE EXCEPTION 'O valor de Koins deve ser maior que zero';
  END IF;
  
  IF array_length(p_student_ids, 1) IS NULL OR array_length(p_student_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Lista de alunos não pode estar vazia';
  END IF;
  
  -- Iterar sobre cada aluno
  FOREACH v_student_id IN ARRAY p_student_ids
  LOOP
    -- Buscar saldo atual do estudante
    SELECT koins INTO v_student_balance
    FROM public.profiles
    WHERE id = v_student_id;
    
    -- Inserir transação de bônus (related_entity_id = NULL para BONUS)
    INSERT INTO public.koin_transactions (
      user_id,
      type,
      amount,
      description,
      related_entity_id,
      processed_by,
      balance_before,
      balance_after
    ) VALUES (
      v_student_id,
      'BONUS',
      p_koin_amount,
      'Bonificação: ' || p_event_name,
      NULL,  -- NULL porque BONUS não está vinculado a redemption_requests
      p_granted_by,
      v_student_balance,
      v_student_balance + p_koin_amount
    );
    
    -- Atualizar saldo do aluno usando função existente
    PERFORM public.add_koins_to_user(v_student_id, p_koin_amount);
  END LOOP;
END;
$function$;
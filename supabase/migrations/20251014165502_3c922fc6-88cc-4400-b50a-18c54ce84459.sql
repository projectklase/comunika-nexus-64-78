-- Criar função RPC para conceder bônus de Koins
CREATE OR REPLACE FUNCTION public.grant_koin_bonus(
  p_event_name TEXT,
  p_event_description TEXT,
  p_koin_amount INTEGER,
  p_student_ids UUID[],
  p_granted_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id UUID;
  v_event_id UUID;
BEGIN
  -- Validações básicas
  IF p_koin_amount <= 0 THEN
    RAISE EXCEPTION 'O valor de Koins deve ser maior que zero';
  END IF;
  
  IF array_length(p_student_ids, 1) IS NULL OR array_length(p_student_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Lista de alunos não pode estar vazia';
  END IF;
  
  -- Gerar ID único para o evento de bonificação
  v_event_id := gen_random_uuid();
  
  -- Iterar sobre cada aluno
  FOREACH v_student_id IN ARRAY p_student_ids
  LOOP
    -- Inserir transação de bônus
    INSERT INTO public.koin_transactions (
      user_id,
      type,
      amount,
      description,
      related_entity_id,
      processed_by
    ) VALUES (
      v_student_id,
      'BONUS',
      p_koin_amount,
      'Bonificação: ' || p_event_name,
      v_event_id,
      p_granted_by
    );
    
    -- Atualizar saldo do aluno usando função existente
    PERFORM public.add_koins_to_user(v_student_id, p_koin_amount);
  END LOOP;
END;
$function$;
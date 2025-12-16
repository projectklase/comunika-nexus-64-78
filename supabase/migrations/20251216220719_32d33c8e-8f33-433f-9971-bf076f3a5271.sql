-- Criar sequence para códigos de ticket
CREATE SEQUENCE IF NOT EXISTS support_ticket_code_seq START 1;

-- Adicionar coluna ticket_code
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS ticket_code TEXT UNIQUE;

-- Função para gerar código automaticamente
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.ticket_code := 'SUP-' || LPAD(nextval('support_ticket_code_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

-- Trigger para novos tickets
DROP TRIGGER IF EXISTS set_ticket_code ON public.support_tickets;
CREATE TRIGGER set_ticket_code
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  WHEN (NEW.ticket_code IS NULL)
  EXECUTE FUNCTION public.generate_ticket_code();

-- Atualizar tickets existentes que não têm código
DO $$
DECLARE
  r RECORD;
  code_num INT := 1;
BEGIN
  FOR r IN 
    SELECT id FROM public.support_tickets 
    WHERE ticket_code IS NULL 
    ORDER BY created_at ASC
  LOOP
    UPDATE public.support_tickets 
    SET ticket_code = 'SUP-' || LPAD(code_num::text, 4, '0')
    WHERE id = r.id;
    code_num := code_num + 1;
  END LOOP;
  
  -- Atualizar sequence para continuar após o último código usado
  IF code_num > 1 THEN
    PERFORM setval('support_ticket_code_seq', code_num - 1);
  END IF;
END $$;

-- Atualizar RPC get_support_tickets para incluir ticket_code
CREATE OR REPLACE FUNCTION public.get_support_tickets(
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Verify superadmin
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_agg(t ORDER BY 
    CASE t.priority 
      WHEN 'urgent' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'normal' THEN 3 
      ELSE 4 
    END,
    t.created_at DESC
  )
  INTO result
  FROM (
    SELECT 
      st.id,
      st.ticket_code,
      st.subject,
      st.description,
      st.status,
      st.priority,
      st.created_at,
      st.updated_at,
      st.resolved_at,
      st.resolution_notes,
      json_build_object(
        'id', p.id,
        'name', p.name,
        'email', p.email
      ) as admin,
      json_build_object(
        'id', s.id,
        'name', s.name
      ) as school
    FROM public.support_tickets st
    LEFT JOIN public.profiles p ON st.admin_id = p.id
    LEFT JOIN public.schools s ON st.school_id = s.id
    WHERE (p_status IS NULL OR st.status = p_status)
      AND (p_priority IS NULL OR st.priority = p_priority)
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- RPC para deletar ticket (apenas superadmin)
CREATE OR REPLACE FUNCTION public.delete_support_ticket(p_ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_code TEXT;
  v_subject TEXT;
BEGIN
  -- Verify superadmin
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get ticket info for audit log
  SELECT ticket_code, subject INTO v_ticket_code, v_subject
  FROM public.support_tickets WHERE id = p_ticket_id;

  IF v_ticket_code IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  -- Delete attachments first (cascade should handle but be explicit)
  DELETE FROM public.support_ticket_attachments WHERE ticket_id = p_ticket_id;
  
  -- Delete ticket
  DELETE FROM public.support_tickets WHERE id = p_ticket_id;

  -- Log action
  INSERT INTO public.platform_audit_logs (
    superadmin_id, action, entity_type, entity_id, entity_label, details
  ) VALUES (
    auth.uid(), 'DELETE_TICKET', 'support_ticket', p_ticket_id, v_ticket_code,
    jsonb_build_object('subject', v_subject)
  );

  RETURN TRUE;
END;
$$;
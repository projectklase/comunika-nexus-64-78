-- Support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Only superadmins can manage tickets
CREATE POLICY "Superadmins can manage all tickets"
  ON public.support_tickets
  FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Admins can view and create their own tickets
CREATE POLICY "Admins can view own tickets"
  ON public.support_tickets
  FOR SELECT
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can create tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (admin_id = auth.uid());

-- Broadcast messages table
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('all_admins', 'specific_admins', 'all_schools')),
  target_ids UUID[] DEFAULT '{}',
  sent_by UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT NOT NULL DEFAULT 'notification' CHECK (channel IN ('notification', 'email', 'both'))
);

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage broadcasts"
  ON public.broadcast_messages
  FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RPC: Get support tickets
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

-- RPC: Update ticket status
CREATE OR REPLACE FUNCTION public.update_ticket_status(
  p_ticket_id UUID,
  p_status TEXT,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify superadmin
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.support_tickets
  SET 
    status = p_status,
    resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
    resolved_at = CASE WHEN p_status IN ('resolved', 'closed') THEN now() ELSE resolved_at END,
    resolved_by = CASE WHEN p_status IN ('resolved', 'closed') THEN auth.uid() ELSE resolved_by END,
    updated_at = now()
  WHERE id = p_ticket_id;

  -- Log action
  INSERT INTO public.platform_audit_logs (
    superadmin_id, action, entity_type, entity_id, details
  ) VALUES (
    auth.uid(), 'UPDATE_TICKET', 'support_ticket', p_ticket_id,
    jsonb_build_object('new_status', p_status, 'notes', p_resolution_notes)
  );

  RETURN TRUE;
END;
$$;

-- RPC: Create broadcast
CREATE OR REPLACE FUNCTION public.create_broadcast(
  p_title TEXT,
  p_message TEXT,
  p_target_type TEXT,
  p_target_ids UUID[] DEFAULT '{}',
  p_channel TEXT DEFAULT 'notification'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast_id UUID;
  v_admin_id UUID;
BEGIN
  -- Verify superadmin
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Create broadcast record
  INSERT INTO public.broadcast_messages (title, message, target_type, target_ids, sent_by, channel)
  VALUES (p_title, p_message, p_target_type, p_target_ids, auth.uid(), p_channel)
  RETURNING id INTO v_broadcast_id;

  -- Create notifications for target admins
  IF p_target_type = 'all_admins' THEN
    FOR v_admin_id IN 
      SELECT DISTINCT ur.user_id 
      FROM public.user_roles ur 
      WHERE ur.role = 'administrador'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, role_target)
      VALUES (v_admin_id, 'BROADCAST', p_title, p_message, 'ADMINISTRADOR');
    END LOOP;
  ELSIF p_target_type = 'specific_admins' AND array_length(p_target_ids, 1) > 0 THEN
    FOREACH v_admin_id IN ARRAY p_target_ids
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, role_target)
      VALUES (v_admin_id, 'BROADCAST', p_title, p_message, 'ADMINISTRADOR');
    END LOOP;
  END IF;

  -- Log action
  INSERT INTO public.platform_audit_logs (
    superadmin_id, action, entity_type, entity_id, details
  ) VALUES (
    auth.uid(), 'BROADCAST_SENT', 'broadcast', v_broadcast_id,
    jsonb_build_object('title', p_title, 'target_type', p_target_type, 'channel', p_channel)
  );

  RETURN v_broadcast_id;
END;
$$;

-- RPC: Log impersonation
CREATE OR REPLACE FUNCTION public.log_impersonation(
  p_target_admin_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_email TEXT;
BEGIN
  -- Verify superadmin
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT email INTO v_target_email FROM public.profiles WHERE id = p_target_admin_id;

  INSERT INTO public.platform_audit_logs (
    superadmin_id, action, entity_type, entity_id, entity_label, details
  ) VALUES (
    auth.uid(), p_action, 'impersonation', p_target_admin_id, v_target_email,
    jsonb_build_object('timestamp', now())
  );

  RETURN TRUE;
END;
$$;
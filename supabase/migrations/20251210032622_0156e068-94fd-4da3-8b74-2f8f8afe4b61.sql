-- Fix RLS policy for notifications to allow professors to create notifications
-- Issue: Professor cannot send activity reminders due to RLS policy rejection

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;

-- Create improved policy with explicit authenticated role and fallback to school_memberships
CREATE POLICY "Users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Secretaria e professores podem criar notificações (via user_roles)
  has_role(auth.uid(), 'secretaria'::app_role) 
  OR has_role(auth.uid(), 'professor'::app_role)
  OR has_role(auth.uid(), 'administrador'::app_role)
  -- Fallback: verificar via school_memberships (fonte de verdade do sistema)
  OR EXISTS (
    SELECT 1 FROM school_memberships 
    WHERE user_id = auth.uid() 
    AND role IN ('secretaria', 'professor', 'administrador')
  )
  -- Ou o usuário está criando notificação para si mesmo
  OR auth.uid() = user_id
);
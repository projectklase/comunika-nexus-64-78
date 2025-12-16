-- RLS policies for secretarias to create and view support tickets
-- These are ADDITIVE policies that do not modify existing policies

-- Allow secretarias to create support tickets
CREATE POLICY "Secretarias can create support tickets"
ON support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  admin_id = auth.uid() 
  AND has_role(auth.uid(), 'secretaria')
);

-- Allow secretarias to view their own support tickets
CREATE POLICY "Secretarias can view own support tickets"
ON support_tickets
FOR SELECT
TO authenticated
USING (
  admin_id = auth.uid() 
  AND has_role(auth.uid(), 'secretaria')
);
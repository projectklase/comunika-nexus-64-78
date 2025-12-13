-- Permitir que administradores insiram seu próprio registro de billing_info
CREATE POLICY "Admins can insert own billing_info"
ON public.billing_info
FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid() AND has_role(auth.uid(), 'administrador'::app_role));
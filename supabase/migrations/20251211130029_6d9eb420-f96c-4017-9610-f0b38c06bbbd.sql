-- Insert quick_logins_visible feature flag (controlled by superadmin only)
INSERT INTO public.feature_flags (key, enabled, description, updated_at)
VALUES (
  'quick_logins_visible',
  false,
  'Controla visibilidade dos quick logins de demonstração na página de login. Apenas superadmin pode alterar.',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- RLS policy for feature_flags - superadmin can update
CREATE POLICY "Superadmin can update feature flags"
ON public.feature_flags
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

-- Anyone authenticated can read feature flags (needed for login page check)
CREATE POLICY "Authenticated users can read feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

-- Anonymous users can also read (needed before login)
CREATE POLICY "Anonymous users can read feature flags"
ON public.feature_flags
FOR SELECT
TO anon
USING (true);
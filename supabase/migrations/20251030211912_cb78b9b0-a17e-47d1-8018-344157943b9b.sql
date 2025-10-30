-- Fase 1: RLS Policies para Administrador Gerenciar Secretarias

-- 1. Policy para admin VER roles de secretaria
CREATE POLICY "Administrador pode ver roles de secretaria"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND role = 'secretaria'::app_role
);

-- 2. Policy para admin CRIAR roles de secretaria
CREATE POLICY "Administrador pode criar roles de secretaria"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role)
  AND role = 'secretaria'::app_role
);

-- 3. Policy para admin DELETAR roles de secretaria
CREATE POLICY "Administrador pode deletar roles de secretaria"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role)
  AND role = 'secretaria'::app_role
);

-- 4. Policy para admin CRIAR profiles de secretaria
CREATE POLICY "Administrador pode criar profiles de secretaria"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role)
);

-- 5. Índice para melhorar performance de queries filtradas por role
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 6. Comentários para documentação
COMMENT ON POLICY "Administrador pode ver roles de secretaria" ON public.user_roles IS 
'Permite que administradores visualizem apenas roles do tipo secretaria';

COMMENT ON POLICY "Administrador pode criar roles de secretaria" ON public.user_roles IS 
'Permite que administradores criem novos usuários com role secretaria';

COMMENT ON POLICY "Administrador pode deletar roles de secretaria" ON public.user_roles IS 
'Permite que administradores removam roles de secretaria (arquivamento)';

COMMENT ON POLICY "Administrador pode criar profiles de secretaria" ON public.profiles IS 
'Permite que administradores criem perfis para novos usuários secretaria';
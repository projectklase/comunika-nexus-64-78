-- Fase 1: Adicionar política de INSERT para administrador na tabela challenges
CREATE POLICY "Administrador pode criar desafios"
ON public.challenges
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Fase 2: Adicionar política de UPDATE para administrador na tabela challenges
CREATE POLICY "Administrador pode atualizar desafios"
ON public.challenges
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Fase 3: Adicionar política de DELETE para administrador na tabela challenges
CREATE POLICY "Administrador pode deletar desafios"
ON public.challenges
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role));
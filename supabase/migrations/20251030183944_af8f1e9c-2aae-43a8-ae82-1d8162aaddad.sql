-- Fase 1: Adicionar política de leitura para administrador na tabela audit_events
CREATE POLICY "Administrador pode ler todo o histórico"
ON public.audit_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role));

-- Fase 2: Adicionar política de leitura para administrador na tabela challenges
CREATE POLICY "Administrador pode ler todos os desafios"
ON public.challenges
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role));
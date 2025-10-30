-- ============================================================================
-- MIGRAÇÃO: Políticas RLS para role 'administrador'
-- RISK LEVEL: MEDIUM (Adiciona novas permissões)
-- SECURITY: Usa has_role() para evitar recursão infinita
-- ============================================================================

-- ============================================================================
-- 1. POLÍTICAS PARA school_settings
-- ============================================================================

-- Permite ao administrador gerenciar todas as configurações da escola
CREATE POLICY "Administrador pode gerenciar school_settings"
ON public.school_settings
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- ============================================================================
-- 2. POLÍTICAS PARA profiles
-- ============================================================================

-- Permite ao administrador ver todos os perfis
CREATE POLICY "Administrador pode ver todos os profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role));

-- Permite ao administrador atualizar todos os perfis
CREATE POLICY "Administrador pode atualizar todos os profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- ============================================================================
-- 3. POLÍTICAS PARA user_roles
-- ============================================================================

-- Permite ao administrador ver todas as roles
CREATE POLICY "Administrador pode ver todas as roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role));

-- Permite ao administrador gerenciar roles (inserir, atualizar, deletar)
CREATE POLICY "Administrador pode gerenciar roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- ============================================================================
-- 4. POLÍTICAS PARA classes
-- ============================================================================

-- Permite ao administrador ver todas as turmas
CREATE POLICY "Administrador pode ver todas as turmas"
ON public.classes
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role));

-- ============================================================================
-- 5. POLÍTICAS PARA posts
-- ============================================================================

-- Permite ao administrador ver todos os posts (publicados e rascunhos)
CREATE POLICY "Administrador pode ver todos os posts"
ON public.posts
FOR SELECT
USING (has_role(auth.uid(), 'administrador'::app_role));

-- ============================================================================
-- VALIDAÇÃO:
-- Execute após a migração para verificar as políticas criadas:
-- 
-- SELECT policyname, tablename, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE policyname ILIKE '%administrador%'
-- ORDER BY tablename, policyname;
-- ============================================================================
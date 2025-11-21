-- ============================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA: RLS POLICIES
-- Remover policies permissivas e criar restritivas
-- ============================================

-- 1. Remover policies permissivas de Secretaria
DROP POLICY IF EXISTS "Secretaria pode gerenciar todos os posts" ON public.posts;

-- 2. Criar policy restritiva para Secretaria (SEMPRE verifica escola)
CREATE POLICY "Secretaria pode gerenciar posts de sua escola"
ON public.posts
FOR ALL
USING (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND user_has_school_access(auth.uid(), school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND user_has_school_access(auth.uid(), school_id)
);

-- 3. Remover policies permissivas de Administrador
DROP POLICY IF EXISTS "Administrador pode ver todos os posts" ON public.posts;
DROP POLICY IF EXISTS "Administrador pode atualizar posts" ON public.posts;
DROP POLICY IF EXISTS "Administrador pode criar posts" ON public.posts;
DROP POLICY IF EXISTS "Administrador pode deletar posts" ON public.posts;

-- 4. Criar policy restritiva unificada para Administrador
CREATE POLICY "Administrador pode gerenciar posts de sua escola"
ON public.posts
FOR ALL
USING (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND user_has_school_access(auth.uid(), school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND user_has_school_access(auth.uid(), school_id)
);

-- 5. Remover policy duplicada/redundante
DROP POLICY IF EXISTS "Teachers and admins can manage posts" ON public.posts;

-- ============================================
-- RESULTADO:
-- - Todas as policies agora verificam escola
-- - Sem OR lógico entre policies permissivas
-- - Isolamento multi-tenant garantido
-- ============================================
-- =============================================
-- CORREÇÃO DE SEGURANÇA: Políticas RLS de profiles
-- Adiciona filtro de escola para UPDATE e INSERT
-- =============================================

-- FASE 1: Corrigir Políticas de UPDATE

-- 1.1 Secretaria - atualizar perfis (adicionar filtro de escola)
DROP POLICY IF EXISTS "Secretaria pode atualizar perfis" ON public.profiles;

CREATE POLICY "Secretaria pode atualizar perfis de sua escola"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND user_has_school_access(auth.uid(), current_school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND user_has_school_access(auth.uid(), current_school_id)
);

-- 1.2 Administrador - atualizar perfis (adicionar filtro de escola)
DROP POLICY IF EXISTS "Administrador pode atualizar todos os profiles" ON public.profiles;

CREATE POLICY "Administrador pode atualizar perfis de sua escola"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND user_has_school_access(auth.uid(), current_school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND user_has_school_access(auth.uid(), current_school_id)
);

-- FASE 2: Corrigir Políticas de INSERT

-- 2.1 Secretaria - criar perfis (adicionar filtro de escola)
DROP POLICY IF EXISTS "Secretaria pode criar perfis" ON public.profiles;

CREATE POLICY "Secretaria pode criar perfis em sua escola"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND user_has_school_access(auth.uid(), current_school_id)
);

-- 2.2 Administrador - criar perfis (adicionar filtro de escola)
DROP POLICY IF EXISTS "Administrador pode criar profiles de secretaria" ON public.profiles;

CREATE POLICY "Administrador pode criar perfis em sua escola"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND user_has_school_access(auth.uid(), current_school_id)
);
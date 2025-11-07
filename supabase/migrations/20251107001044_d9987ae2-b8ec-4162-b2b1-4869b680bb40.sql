-- ====================================
-- FIX: Corrigir RLS de school_memberships
-- Remove recursão infinita causada por user_has_school_access()
-- ====================================

-- 1. Dropar políticas RLS problemáticas
DROP POLICY IF EXISTS "Admins can manage memberships in their schools" ON public.school_memberships;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.school_memberships;

-- 2. Criar políticas RLS simples e seguras (sem recursão)

-- Usuários podem ver seus próprios memberships
CREATE POLICY "Users can view their own memberships"
ON public.school_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins podem gerenciar todos os memberships
CREATE POLICY "Admins can manage all memberships"
ON public.school_memberships
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'))
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Secretaria pode ver todos os memberships
CREATE POLICY "Secretaria can view all memberships"
ON public.school_memberships
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'secretaria'));
-- ============================================================================
-- FASE 1: Estrutura Base Multi-tenancy
-- ============================================================================
-- Criação das tabelas schools e school_memberships
-- Adição de school_id em todas as tabelas necessárias
-- População de dados iniciais
-- ============================================================================

-- 1. CRIAR TABELA: schools
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.schools IS 'Tabela de escolas para multi-tenancy';

-- 2. CRIAR TABELA: school_memberships
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.school_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('administrador', 'secretaria', 'professor', 'aluno')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, user_id)
);

COMMENT ON TABLE public.school_memberships IS 'Associação entre usuários e escolas';

-- 3. ADICIONAR school_id EM TABELAS EXISTENTES
-- ============================================================================

-- classes
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- deliveries
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- levels
ALTER TABLE public.levels ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- subjects
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- modalities
ALTER TABLE public.modalities ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- programs
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- reward_items
ALTER TABLE public.reward_items ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- challenges
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- audit_events
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- redemption_requests
ALTER TABLE public.redemption_requests ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- koin_transactions
ALTER TABLE public.koin_transactions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- 4. POPULAR ESCOLA PADRÃO E ASSOCIAÇÕES
-- ============================================================================

-- Criar escola padrão (se não existir)
INSERT INTO public.schools (id, name, slug, is_active)
VALUES (
  'e8a5c123-4567-89ab-cdef-000000000001'::UUID,
  'Colégio Klase',
  'klase',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Popular school_id em todas as tabelas com a escola padrão
UPDATE public.classes SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.posts SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.deliveries SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.levels SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.subjects SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.modalities SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.programs SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.reward_items SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.challenges SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.audit_events SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.redemption_requests SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;
UPDATE public.koin_transactions SET school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID WHERE school_id IS NULL;

-- Associar todos os usuários existentes à escola padrão
INSERT INTO public.school_memberships (school_id, user_id, role, is_primary)
SELECT 
  'e8a5c123-4567-89ab-cdef-000000000001'::UUID,
  ur.user_id,
  ur.role::TEXT,
  true
FROM public.user_roles ur
ON CONFLICT (school_id, user_id) DO NOTHING;

-- 5. ADICIONAR current_school_id NO profiles
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- Atualizar current_school_id de todos os usuários para a escola padrão
UPDATE public.profiles 
SET current_school_id = 'e8a5c123-4567-89ab-cdef-000000000001'::UUID 
WHERE current_school_id IS NULL;

-- 6. RLS BÁSICO PARA AS NOVAS TABELAS
-- ============================================================================

-- schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view schools they belong to" ON public.schools;
CREATE POLICY "Users can view schools they belong to"
ON public.schools
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_memberships
    WHERE school_id = schools.id
      AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage their schools" ON public.schools;
CREATE POLICY "Admins can manage their schools"
ON public.schools
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_memberships
    WHERE school_id = schools.id
      AND user_id = auth.uid()
  ) AND public.has_role(auth.uid(), 'administrador')
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador')
);

-- school_memberships
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.school_memberships;
CREATE POLICY "Users can view their own memberships"
ON public.school_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage memberships in their schools" ON public.school_memberships;
CREATE POLICY "Admins can manage memberships in their schools"
ON public.school_memberships
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_memberships sm
    WHERE sm.school_id = school_memberships.school_id
      AND sm.user_id = auth.uid()
  ) AND public.has_role(auth.uid(), 'administrador')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.school_memberships sm
    WHERE sm.school_id = school_memberships.school_id
      AND sm.user_id = auth.uid()
  ) AND public.has_role(auth.uid(), 'administrador')
);

-- 7. ÍNDICES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_school_memberships_user_id ON public.school_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_school_memberships_school_id ON public.school_memberships(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_posts_school_id ON public.posts(school_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_school_id ON public.deliveries(school_id);
CREATE INDEX IF NOT EXISTS idx_levels_school_id ON public.levels(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_modalities_school_id ON public.modalities(school_id);
CREATE INDEX IF NOT EXISTS idx_programs_school_id ON public.programs(school_id);
CREATE INDEX IF NOT EXISTS idx_reward_items_school_id ON public.reward_items(school_id);
CREATE INDEX IF NOT EXISTS idx_challenges_school_id ON public.challenges(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_current_school_id ON public.profiles(current_school_id);

-- ============================================================================
-- FIM DA FASE 1: ESTRUTURA BASE MULTI-TENANCY
-- ============================================================================
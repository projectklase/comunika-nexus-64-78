-- =====================================================
-- FASE 1: SEGURANÇA CRÍTICA - CORREÇÃO
-- Migração de Roles e Correção de RLS Policies
-- =====================================================

-- 1. Migrar roles de profiles para user_roles (se não existirem)
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. DROPAR TODAS AS POLICIES QUE DEPENDEM DE profiles.role

-- PROFILES
DROP POLICY IF EXISTS "Secretaria pode ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Secretaria pode atualizar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Secretaria pode criar perfis" ON public.profiles;

-- MODALITIES
DROP POLICY IF EXISTS "Secretaria can view all modalities" ON public.modalities;
DROP POLICY IF EXISTS "Secretaria can create modalities" ON public.modalities;
DROP POLICY IF EXISTS "Secretaria can update modalities" ON public.modalities;
DROP POLICY IF EXISTS "Secretaria can delete modalities" ON public.modalities;

-- LEVELS
DROP POLICY IF EXISTS "Secretaria can view all levels" ON public.levels;
DROP POLICY IF EXISTS "Secretaria can create levels" ON public.levels;
DROP POLICY IF EXISTS "Secretaria can update levels" ON public.levels;
DROP POLICY IF EXISTS "Secretaria can delete levels" ON public.levels;

-- SUBJECTS
DROP POLICY IF EXISTS "Secretaria can view all subjects" ON public.subjects;
DROP POLICY IF EXISTS "Secretaria can create subjects" ON public.subjects;
DROP POLICY IF EXISTS "Secretaria can update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Secretaria can delete subjects" ON public.subjects;

-- PROGRAMS
DROP POLICY IF EXISTS "Secretaria can view all programs" ON public.programs;
DROP POLICY IF EXISTS "Secretaria can create programs" ON public.programs;
DROP POLICY IF EXISTS "Secretaria can update programs" ON public.programs;
DROP POLICY IF EXISTS "Secretaria can delete programs" ON public.programs;

-- SCHOOL_SETTINGS
DROP POLICY IF EXISTS "Secretaria can view all school_settings" ON public.school_settings;
DROP POLICY IF EXISTS "Secretaria can create school_settings" ON public.school_settings;
DROP POLICY IF EXISTS "Secretaria can update school_settings" ON public.school_settings;
DROP POLICY IF EXISTS "Secretaria can delete school_settings" ON public.school_settings;

-- POSTS
DROP POLICY IF EXISTS "Secretaria pode gerenciar todos os posts" ON public.posts;
DROP POLICY IF EXISTS "Professores podem ver posts publicados" ON public.posts;
DROP POLICY IF EXISTS "Professores podem criar posts" ON public.posts;
DROP POLICY IF EXISTS "Professores podem editar seus próprios posts" ON public.posts;
DROP POLICY IF EXISTS "Professores podem deletar seus próprios posts" ON public.posts;
DROP POLICY IF EXISTS "Alunos podem ver posts publicados" ON public.posts;

-- GUARDIANS
DROP POLICY IF EXISTS "Secretaria pode gerenciar responsáveis" ON public.guardians;
DROP POLICY IF EXISTS "Usuários podem ver responsáveis de seus alunos" ON public.guardians;

-- IMPORT_HISTORY
DROP POLICY IF EXISTS "Secretaria pode gerenciar o histórico de importações" ON public.import_history;

-- KOIN_TRANSACTIONS
DROP POLICY IF EXISTS "Secretaria pode ver todas as transações" ON public.koin_transactions;

-- REWARD_ITEMS
DROP POLICY IF EXISTS "Secretaria pode gerenciar itens da loja" ON public.reward_items;

-- REDEMPTION_REQUESTS
DROP POLICY IF EXISTS "Secretaria pode gerenciar todos os resgates" ON public.redemption_requests;

-- AUDIT_EVENTS
DROP POLICY IF EXISTS "Secretaria pode ler o histórico de auditoria" ON public.audit_events;

-- CLASS_SUBJECTS
DROP POLICY IF EXISTS "Secretaria pode gerenciar Matérias de Turmas" ON public.class_subjects;

-- 3. Remover a coluna role da tabela profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- 4. CRIAR NOVAS POLICIES USANDO has_role()

-- === PROFILES ===
CREATE POLICY "Secretaria pode ver todos os perfis" 
ON public.profiles FOR SELECT 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria pode atualizar perfis" 
ON public.profiles FOR UPDATE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria pode criar perfis" 
ON public.profiles FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'secretaria'::app_role));

-- === MODALITIES ===
CREATE POLICY "Secretaria can view all modalities" 
ON public.modalities FOR SELECT 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can create modalities" 
ON public.modalities FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can update modalities" 
ON public.modalities FOR UPDATE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can delete modalities" 
ON public.modalities FOR DELETE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

-- === LEVELS ===
CREATE POLICY "Secretaria can view all levels" 
ON public.levels FOR SELECT 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can create levels" 
ON public.levels FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can update levels" 
ON public.levels FOR UPDATE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can delete levels" 
ON public.levels FOR DELETE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

-- === SUBJECTS ===
CREATE POLICY "Secretaria can view all subjects" 
ON public.subjects FOR SELECT 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can create subjects" 
ON public.subjects FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can update subjects" 
ON public.subjects FOR UPDATE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can delete subjects" 
ON public.subjects FOR DELETE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

-- === PROGRAMS ===
CREATE POLICY "Secretaria can view all programs" 
ON public.programs FOR SELECT 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can create programs" 
ON public.programs FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can update programs" 
ON public.programs FOR UPDATE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can delete programs" 
ON public.programs FOR DELETE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

-- === SCHOOL_SETTINGS ===
CREATE POLICY "Secretaria can view all school_settings" 
ON public.school_settings FOR SELECT 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can create school_settings" 
ON public.school_settings FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can update school_settings" 
ON public.school_settings FOR UPDATE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Secretaria can delete school_settings" 
ON public.school_settings FOR DELETE 
USING (has_role(auth.uid(), 'secretaria'::app_role));

-- === POSTS ===
CREATE POLICY "Secretaria pode gerenciar todos os posts" 
ON public.posts FOR ALL 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Professores podem ver posts publicados" 
ON public.posts FOR SELECT 
USING (status = 'PUBLISHED' AND has_role(auth.uid(), 'professor'::app_role));

CREATE POLICY "Professores podem criar posts" 
ON public.posts FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'professor'::app_role) AND author_id = auth.uid());

CREATE POLICY "Professores podem editar seus próprios posts" 
ON public.posts FOR UPDATE 
USING (author_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role));

CREATE POLICY "Professores podem deletar seus próprios posts" 
ON public.posts FOR DELETE 
USING (author_id = auth.uid() AND has_role(auth.uid(), 'professor'::app_role));

CREATE POLICY "Alunos podem ver posts publicados" 
ON public.posts FOR SELECT 
USING (
  status = 'PUBLISHED' 
  AND has_role(auth.uid(), 'aluno'::app_role)
  AND (
    audience = 'GLOBAL'
    OR (
      audience = 'CLASS'
      AND EXISTS (
        SELECT 1 FROM class_students
        WHERE class_students.student_id = auth.uid()
        AND class_students.class_id::text = ANY(posts.class_ids)
      )
    )
  )
);

-- === GUARDIANS ===
CREATE POLICY "Secretaria pode gerenciar responsáveis" 
ON public.guardians FOR ALL 
USING (has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Usuários podem ver responsáveis de seus alunos" 
ON public.guardians FOR SELECT 
USING (
  has_role(auth.uid(), 'secretaria'::app_role)
  OR auth.uid() = student_id
  OR has_role(auth.uid(), 'professor'::app_role)
);

-- === IMPORT_HISTORY ===
CREATE POLICY "Secretaria pode gerenciar o histórico de importações" 
ON public.import_history FOR ALL 
USING (has_role(auth.uid(), 'secretaria'::app_role));

-- === KOIN_TRANSACTIONS ===
CREATE POLICY "Secretaria pode ver todas as transações" 
ON public.koin_transactions FOR SELECT 
USING (has_role(auth.uid(), 'secretaria'::app_role));

-- === REWARD_ITEMS ===
CREATE POLICY "Secretaria pode gerenciar itens da loja" 
ON public.reward_items FOR ALL 
USING (has_role(auth.uid(), 'secretaria'::app_role));

-- === REDEMPTION_REQUESTS ===
CREATE POLICY "Secretaria pode gerenciar todos os resgates" 
ON public.redemption_requests FOR ALL 
USING (has_role(auth.uid(), 'secretaria'::app_role));

-- === AUDIT_EVENTS ===
CREATE POLICY "Secretaria pode ler o histórico de auditoria" 
ON public.audit_events FOR SELECT 
USING (has_role(auth.uid(), 'secretaria'::app_role));

-- === CLASS_SUBJECTS ===
CREATE POLICY "Secretaria pode gerenciar Matérias de Turmas" 
ON public.class_subjects FOR ALL 
USING (has_role(auth.uid(), 'secretaria'::app_role));
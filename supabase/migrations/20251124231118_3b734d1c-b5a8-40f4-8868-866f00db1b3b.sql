-- ============================================================================
-- MIGRATION: Correção Crítica de Segurança - RLS Policies
-- Data: 2025-01-24
-- Descrição: Corrige exposição pública de dados sensíveis (CPF, emails, telefones)
-- ============================================================================

-- ============================================================================
-- FASE 1: CORRIGIR RLS DA TABELA profiles (CRÍTICO - EXPÕE CPF, EMAILS, TELEFONES)
-- ============================================================================

-- ❌ DELETAR policy insegura que expõe todos os perfis
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- ✅ CRIAR policies seguras e restritivas

-- 1. Usuários autenticados veem apenas seu próprio perfil
CREATE POLICY "Users can view their own profile securely"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Administradores veem perfis apenas de sua escola
CREATE POLICY "Admins can view profiles from their school"
ON profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role) AND
  user_has_school_access(auth.uid(), current_school_id)
);

-- 3. Secretárias veem perfis apenas de sua escola
CREATE POLICY "Secretarias can view profiles from their school"
ON profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'secretaria'::app_role) AND
  user_has_school_access(auth.uid(), current_school_id)
);

-- 4. Professores veem apenas perfis de alunos de suas turmas
CREATE POLICY "Professors can view their class students profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role) AND
  (
    -- Professores podem ver seus próprios perfis
    auth.uid() = profiles.id
    OR
    -- Professores podem ver alunos de suas turmas
    EXISTS (
      SELECT 1 FROM class_students cs
      INNER JOIN classes c ON c.id = cs.class_id
      WHERE cs.student_id = profiles.id
        AND c.main_teacher_id = auth.uid()
    )
  )
);

-- ============================================================================
-- FASE 2: CORRIGIR RLS DA TABELA deliveries (CRÍTICO - EXPÕE ENTREGAS PÚBLICAS)
-- ============================================================================

-- ❌ DELETAR policies inseguras
DROP POLICY IF EXISTS "Estudantes podem ver suas próprias entregas" ON deliveries;
DROP POLICY IF EXISTS "Usuários podem ver anexos de entregas" ON deliveries;

-- ✅ CRIAR policies seguras

-- 1. Alunos veem apenas suas próprias entregas
CREATE POLICY "Students can view only their own deliveries"
ON deliveries FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
);

-- 2. Professores veem entregas de turmas de sua escola
CREATE POLICY "Teachers can view deliveries from their school classes"
ON deliveries FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role) AND
  user_has_school_access(auth.uid(), school_id)
);

-- 3. Administradores e Secretárias veem entregas de sua escola
CREATE POLICY "Admins and Secretarias can view deliveries from their school"
ON deliveries FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR 
   has_role(auth.uid(), 'secretaria'::app_role)) AND
  user_has_school_access(auth.uid(), school_id)
);

-- ============================================================================
-- FASE 3: CORRIGIR RLS DA TABELA delivery_attachments (CRÍTICO - EXPÕE ARQUIVOS)
-- ============================================================================

-- ❌ DELETAR policy insegura
DROP POLICY IF EXISTS "Usuários podem ver anexos de entregas" ON delivery_attachments;

-- ✅ CRIAR policy segura - anexos visíveis apenas para quem pode ver a entrega
CREATE POLICY "Users can view attachments of accessible deliveries"
ON delivery_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d.id = delivery_attachments.delivery_id
      AND (
        -- Aluno dono da entrega
        d.student_id = auth.uid() 
        OR
        -- Professores da escola
        (has_role(auth.uid(), 'professor'::app_role) AND 
         user_has_school_access(auth.uid(), d.school_id))
        OR
        -- Administradores da escola
        (has_role(auth.uid(), 'administrador'::app_role) AND 
         user_has_school_access(auth.uid(), d.school_id))
        OR
        -- Secretárias da escola
        (has_role(auth.uid(), 'secretaria'::app_role) AND 
         user_has_school_access(auth.uid(), d.school_id))
      )
  )
);

-- ============================================================================
-- FASE 4: CORRIGIR RLS DA TABELA reward_items (EXPÕE PREÇOS E ESTOQUE)
-- ============================================================================

-- ✅ CRIAR policy para membros autenticados da escola
CREATE POLICY "School members can view reward items from their school"
ON reward_items FOR SELECT
TO authenticated
USING (
  user_has_school_access(auth.uid(), school_id)
);

-- ============================================================================
-- FASE 5: CORRIGIR search_path DAS FUNÇÕES RPC (VULNERABILIDADE SQL INJECTION)
-- ============================================================================

-- Corrigir função get_evasion_risk_analytics
ALTER FUNCTION get_evasion_risk_analytics(integer, uuid) 
SET search_path = 'public';

-- Corrigir função get_post_read_analytics
ALTER FUNCTION get_post_read_analytics(integer, uuid) 
SET search_path = 'public';

-- Corrigir função get_family_metrics (se existir com search_path mutável)
ALTER FUNCTION get_family_metrics(uuid) 
SET search_path = 'public';

-- ============================================================================
-- LOGS E VALIDAÇÃO
-- ============================================================================

-- Registrar no log que a migration de segurança foi aplicada
DO $$
BEGIN
  RAISE NOTICE '✅ MIGRATION COMPLETA: Políticas RLS críticas corrigidas';
  RAISE NOTICE '✅ Tabela profiles: 4 policies seguras criadas';
  RAISE NOTICE '✅ Tabela deliveries: 3 policies seguras criadas';
  RAISE NOTICE '✅ Tabela delivery_attachments: 1 policy segura criada';
  RAISE NOTICE '✅ Tabela reward_items: 1 policy segura criada';
  RAISE NOTICE '✅ Funções RPC: search_path corrigido';
  RAISE NOTICE '⚠️ AÇÃO MANUAL NECESSÁRIA: Habilitar "Leaked Password Protection" no Supabase Dashboard';
END $$;
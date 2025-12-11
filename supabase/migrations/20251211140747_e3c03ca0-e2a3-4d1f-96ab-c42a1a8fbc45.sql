-- =============================================
-- CORREÇÃO RLS: deliveries - Restringir acesso de professores por turma
-- =============================================

-- 1. Remover políticas permissivas de professores
DROP POLICY IF EXISTS "Teachers can view deliveries from their school classes" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view deliveries from their school" ON public.deliveries;
DROP POLICY IF EXISTS "Professores podem atualizar entregas (revisão)" ON public.deliveries;

-- 2. Remover política ampla de estudantes que pode incluir professores
DROP POLICY IF EXISTS "Students can manage their deliveries" ON public.deliveries;

-- 3. Criar política SELECT restritiva para professores (apenas suas turmas ou seus posts)
CREATE POLICY "Professor pode ver entregas de suas turmas ou seus posts"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role) 
  AND user_has_school_access(auth.uid(), school_id)
  AND (
    -- Opção 1: É main_teacher da turma da entrega (class_id é TEXT, classes.id é UUID)
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = deliveries.class_id::uuid
      AND c.main_teacher_id = auth.uid()
    )
    -- OU Opção 2: É autor do post relacionado (post_id é TEXT, posts.id é UUID)
    OR EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = deliveries.post_id::uuid
      AND p.author_id = auth.uid()
    )
  )
);

-- 4. Criar política UPDATE restritiva para professores (revisão de entregas)
CREATE POLICY "Professor pode revisar entregas de suas turmas ou seus posts"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role) 
  AND user_has_school_access(auth.uid(), school_id)
  AND (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = deliveries.class_id::uuid
      AND c.main_teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = deliveries.post_id::uuid
      AND p.author_id = auth.uid()
    )
  )
);

-- 5. Recriar política de estudantes com escopo correto (student_id já é UUID)
CREATE POLICY "Estudantes podem gerenciar suas próprias entregas"
ON public.deliveries
FOR ALL
TO authenticated
USING (
  user_has_school_access(auth.uid(), school_id) 
  AND student_id = auth.uid()
)
WITH CHECK (
  user_has_school_access(auth.uid(), school_id) 
  AND student_id = auth.uid()
);
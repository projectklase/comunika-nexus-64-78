-- ============================================================
-- MIGRATION: Fix class_students RLS for admin/secretaria
-- BUG: Admin e Secretaria não conseguem visualizar contador de alunos
-- ROOT CAUSE: Política "FOR ALL" não permite agregações (COUNT)
-- SOLUTION: Substituir por políticas explícitas (SELECT/INSERT/UPDATE/DELETE)
-- ============================================================

-- Step 1: Drop existing generic policies for secretaria and admin
DROP POLICY IF EXISTS "Secretaria pode gerenciar Alunos de Turmas" ON public.class_students;
DROP POLICY IF EXISTS "Administrador pode gerenciar alunos de turmas" ON public.class_students;

-- Step 2: Create explicit SELECT policies (allows COUNT aggregations)
CREATE POLICY "Secretaria pode visualizar alunos de turmas"
ON public.class_students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'secretaria'::app_role
  )
);

CREATE POLICY "Administrador pode visualizar alunos de turmas"
ON public.class_students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'administrador'::app_role
  )
);

-- Step 3: Create explicit INSERT policies
CREATE POLICY "Secretaria pode adicionar alunos em turmas"
ON public.class_students
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'secretaria'::app_role
  )
);

CREATE POLICY "Administrador pode adicionar alunos em turmas"
ON public.class_students
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'administrador'::app_role
  )
);

-- Step 4: Create explicit UPDATE policies
CREATE POLICY "Secretaria pode atualizar matrículas"
ON public.class_students
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'secretaria'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'secretaria'::app_role
  )
);

CREATE POLICY "Administrador pode atualizar matrículas"
ON public.class_students
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'administrador'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'administrador'::app_role
  )
);

-- Step 5: Create explicit DELETE policies
CREATE POLICY "Secretaria pode remover alunos de turmas"
ON public.class_students
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'secretaria'::app_role
  )
);

CREATE POLICY "Administrador pode remover alunos de turmas"
ON public.class_students
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'administrador'::app_role
  )
);

-- ============================================================
-- VALIDATION QUERY (Run this to verify policies were created):
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'class_students' 
-- AND schemaname = 'public'
-- ORDER BY policyname;
-- ============================================================
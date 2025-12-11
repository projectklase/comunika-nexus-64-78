-- =============================================
-- CORREÇÃO DE SEGURANÇA: Políticas RLS de guardians
-- Adiciona isolamento multi-tenant via student_id → school_memberships
-- =============================================

-- FASE 1: Remover políticas antigas sem filtro de escola

DROP POLICY IF EXISTS "Administrador pode gerenciar responsáveis" ON public.guardians;
DROP POLICY IF EXISTS "Secretaria pode gerenciar responsáveis" ON public.guardians;
DROP POLICY IF EXISTS "Usuários podem ver responsáveis de seus alunos" ON public.guardians;

-- FASE 2: Criar políticas de SELECT com filtro de escola

-- 2.1 Administrador - SELECT apenas guardians de alunos de suas escolas
CREATE POLICY "Administrador pode ver responsáveis de sua escola"
ON public.guardians
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = guardians.student_id
    AND sm_user.user_id = auth.uid()
  )
);

-- 2.2 Secretaria - SELECT apenas guardians de alunos de suas escolas
CREATE POLICY "Secretaria pode ver responsáveis de sua escola"
ON public.guardians
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = guardians.student_id
    AND sm_user.user_id = auth.uid()
  )
);

-- 2.3 Professor - SELECT apenas guardians de alunos de suas escolas
CREATE POLICY "Professor pode ver responsáveis de alunos de sua escola"
ON public.guardians
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = guardians.student_id
    AND sm_user.user_id = auth.uid()
  )
);

-- 2.4 Aluno - SELECT apenas seus próprios responsáveis
CREATE POLICY "Aluno pode ver seus próprios responsáveis"
ON public.guardians
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- FASE 3: Criar políticas de INSERT com filtro de escola

-- 3.1 Administrador - INSERT apenas para alunos de suas escolas
CREATE POLICY "Administrador pode criar responsáveis em sua escola"
ON public.guardians
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = student_id
    AND sm_user.user_id = auth.uid()
  )
);

-- 3.2 Secretaria - INSERT apenas para alunos de suas escolas
CREATE POLICY "Secretaria pode criar responsáveis em sua escola"
ON public.guardians
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = student_id
    AND sm_user.user_id = auth.uid()
  )
);

-- FASE 4: Criar políticas de UPDATE com filtro de escola

-- 4.1 Administrador - UPDATE apenas guardians de alunos de suas escolas
CREATE POLICY "Administrador pode atualizar responsáveis de sua escola"
ON public.guardians
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = guardians.student_id
    AND sm_user.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = student_id
    AND sm_user.user_id = auth.uid()
  )
);

-- 4.2 Secretaria - UPDATE apenas guardians de alunos de suas escolas
CREATE POLICY "Secretaria pode atualizar responsáveis de sua escola"
ON public.guardians
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = guardians.student_id
    AND sm_user.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = student_id
    AND sm_user.user_id = auth.uid()
  )
);

-- FASE 5: Criar políticas de DELETE com filtro de escola

-- 5.1 Administrador - DELETE apenas guardians de alunos de suas escolas
CREATE POLICY "Administrador pode deletar responsáveis de sua escola"
ON public.guardians
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = guardians.student_id
    AND sm_user.user_id = auth.uid()
  )
);

-- 5.2 Secretaria - DELETE apenas guardians de alunos de suas escolas
CREATE POLICY "Secretaria pode deletar responsáveis de sua escola"
ON public.guardians
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND EXISTS (
    SELECT 1 FROM school_memberships sm_student
    JOIN school_memberships sm_user ON sm_user.school_id = sm_student.school_id
    WHERE sm_student.user_id = guardians.student_id
    AND sm_user.user_id = auth.uid()
  )
);
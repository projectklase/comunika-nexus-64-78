-- ============================================================================
-- FASE 7: Aplicar RLS Multi-tenancy em Todas as Tabelas
-- ============================================================================
-- Remove políticas antigas e aplica novas políticas com filtro de escola
-- ============================================================================

-- 1. FUNÇÃO DE SEGURANÇA: Verificar acesso à escola (se não existir)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_has_school_access(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_memberships
    WHERE user_id = _user_id
      AND school_id = _school_id
  )
$$;

-- 2. RLS PARA classes
-- ============================================================================
DROP POLICY IF EXISTS "Users can view classes from their school" ON public.classes;
CREATE POLICY "Users can view classes from their school"
ON public.classes
FOR SELECT
TO authenticated
USING (public.user_has_school_access(auth.uid(), school_id));

DROP POLICY IF EXISTS "Admins and Secretaria can manage classes" ON public.classes;
CREATE POLICY "Admins and Secretaria can manage classes"
ON public.classes
FOR ALL
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
)
WITH CHECK (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

-- 3. RLS PARA posts
-- ============================================================================
DROP POLICY IF EXISTS "Users can view posts from their school" ON public.posts;
CREATE POLICY "Users can view posts from their school"
ON public.posts
FOR SELECT
TO authenticated
USING (public.user_has_school_access(auth.uid(), school_id));

DROP POLICY IF EXISTS "Teachers and admins can manage posts" ON public.posts;
CREATE POLICY "Teachers and admins can manage posts"
ON public.posts
FOR ALL
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
)
WITH CHECK (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

-- 4. RLS PARA deliveries
-- ============================================================================
DROP POLICY IF EXISTS "Users can view deliveries from their school" ON public.deliveries;
CREATE POLICY "Users can view deliveries from their school"
ON public.deliveries
FOR SELECT
TO authenticated
USING (public.user_has_school_access(auth.uid(), school_id));

DROP POLICY IF EXISTS "Students can manage their deliveries" ON public.deliveries;
CREATE POLICY "Students can manage their deliveries"
ON public.deliveries
FOR ALL
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (student_id = auth.uid() OR public.has_role(auth.uid(), 'professor') OR public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
)
WITH CHECK (
  public.user_has_school_access(auth.uid(), school_id) AND
  student_id = auth.uid()
);

-- 5. RLS PARA levels
-- ============================================================================
DROP POLICY IF EXISTS "Users can view levels from their school" ON public.levels;
CREATE POLICY "Users can view levels from their school"
ON public.levels
FOR SELECT
TO authenticated
USING (public.user_has_school_access(auth.uid(), school_id));

DROP POLICY IF EXISTS "Admins and Secretaria can manage levels" ON public.levels;
CREATE POLICY "Admins and Secretaria can manage levels"
ON public.levels
FOR ALL
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
)
WITH CHECK (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

-- 6. RLS PARA subjects
-- ============================================================================
DROP POLICY IF EXISTS "Users can view subjects from their school" ON public.subjects;
CREATE POLICY "Users can view subjects from their school"
ON public.subjects
FOR SELECT
TO authenticated
USING (public.user_has_school_access(auth.uid(), school_id));

DROP POLICY IF EXISTS "Admins and Secretaria can manage subjects" ON public.subjects;
CREATE POLICY "Admins and Secretaria can manage subjects"
ON public.subjects
FOR ALL
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
)
WITH CHECK (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

-- 7. RLS PARA modalities
-- ============================================================================
DROP POLICY IF EXISTS "Users can view modalities from their school" ON public.modalities;
CREATE POLICY "Users can view modalities from their school"
ON public.modalities
FOR SELECT
TO authenticated
USING (public.user_has_school_access(auth.uid(), school_id));

DROP POLICY IF EXISTS "Admins and Secretaria can manage modalities" ON public.modalities;
CREATE POLICY "Admins and Secretaria can manage modalities"
ON public.modalities
FOR ALL
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
)
WITH CHECK (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

-- 8. RLS PARA programs
-- ============================================================================
DROP POLICY IF EXISTS "Users can view programs from their school" ON public.programs;
CREATE POLICY "Users can view programs from their school"
ON public.programs
FOR SELECT
TO authenticated
USING (public.user_has_school_access(auth.uid(), school_id));

DROP POLICY IF EXISTS "Admins and Secretaria can manage programs" ON public.programs;
CREATE POLICY "Admins and Secretaria can manage programs"
ON public.programs
FOR ALL
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
)
WITH CHECK (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

-- 9. RLS PARA reward_items
-- ============================================================================
DROP POLICY IF EXISTS "Users can view reward items from their school" ON public.reward_items;
CREATE POLICY "Users can view reward items from their school"
ON public.reward_items
FOR SELECT
TO authenticated
USING (public.user_has_school_access(auth.uid(), school_id) AND is_active = true);

DROP POLICY IF EXISTS "Admins and Secretaria can manage rewards" ON public.reward_items;
CREATE POLICY "Admins and Secretaria can manage rewards"
ON public.reward_items
FOR ALL
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
)
WITH CHECK (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

-- 10. RLS PARA challenges
-- ============================================================================
DROP POLICY IF EXISTS "Users can view challenges from their school" ON public.challenges;
CREATE POLICY "Users can view challenges from their school"
ON public.challenges
FOR SELECT
TO authenticated
USING (public.user_has_school_access(auth.uid(), school_id) AND is_active = true);

DROP POLICY IF EXISTS "Admins and Secretaria can manage challenges" ON public.challenges;
CREATE POLICY "Admins and Secretaria can manage challenges"
ON public.challenges
FOR ALL
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
)
WITH CHECK (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

-- 11. RLS PARA audit_events
-- ============================================================================
DROP POLICY IF EXISTS "Users can view audit from their school" ON public.audit_events;
CREATE POLICY "Users can view audit from their school"
ON public.audit_events
FOR SELECT
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

DROP POLICY IF EXISTS "System can insert audit events" ON public.audit_events;
CREATE POLICY "System can insert audit events"
ON public.audit_events
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_school_access(auth.uid(), school_id));

-- 12. RLS PARA redemption_requests
-- ============================================================================
DROP POLICY IF EXISTS "Users can view redemptions from their school" ON public.redemption_requests;
CREATE POLICY "Users can view redemptions from their school"
ON public.redemption_requests
FOR SELECT
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (student_id = auth.uid() OR public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

DROP POLICY IF EXISTS "Students can request redemptions" ON public.redemption_requests;
CREATE POLICY "Students can request redemptions"
ON public.redemption_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_school_access(auth.uid(), school_id) AND
  student_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins and Secretaria can manage redemptions" ON public.redemption_requests;
CREATE POLICY "Admins and Secretaria can manage redemptions"
ON public.redemption_requests
FOR UPDATE
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

-- 13. RLS PARA koin_transactions
-- ============================================================================
DROP POLICY IF EXISTS "Users can view transactions from their school" ON public.koin_transactions;
CREATE POLICY "Users can view transactions from their school"
ON public.koin_transactions
FOR SELECT
TO authenticated
USING (
  public.user_has_school_access(auth.uid(), school_id) AND
  (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'secretaria'))
);

-- ============================================================================
-- FIM DA APLICAÇÃO DE RLS MULTI-TENANCY
-- ============================================================================
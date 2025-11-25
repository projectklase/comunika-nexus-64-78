-- Permitir secretárias com permissões gerenciarem memberships de professores

-- Política para INSERT: secretárias podem adicionar professores às escolas autorizadas
CREATE POLICY "Secretarias can insert teacher memberships for their permitted schools"
ON public.school_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  -- Apenas para professores
  role = 'professor'
  AND
  -- Secretária deve ter permissão para a escola
  has_role(auth.uid(), 'secretaria'::app_role)
  AND
  EXISTS (
    SELECT 1 
    FROM secretaria_permissions sp
    WHERE sp.secretaria_id = auth.uid()
      AND sp.permission_key = 'manage_all_schools'
      AND (
        -- Permissão total (todas as escolas)
        sp.permission_value->>'schools' = '*'
        OR
        -- Permissão específica (escola listada no array)
        school_memberships.school_id::text = ANY(
          SELECT jsonb_array_elements_text(sp.permission_value->'schools')
        )
      )
  )
);

-- Política para DELETE: secretárias podem remover professores das escolas autorizadas
CREATE POLICY "Secretarias can delete teacher memberships for their permitted schools"
ON public.school_memberships
FOR DELETE
TO authenticated
USING (
  -- Apenas para professores
  role = 'professor'
  AND
  -- Secretária deve ter permissão para a escola
  has_role(auth.uid(), 'secretaria'::app_role)
  AND
  EXISTS (
    SELECT 1 
    FROM secretaria_permissions sp
    WHERE sp.secretaria_id = auth.uid()
      AND sp.permission_key = 'manage_all_schools'
      AND (
        -- Permissão total (todas as escolas)
        sp.permission_value->>'schools' = '*'
        OR
        -- Permissão específica (escola listada no array)
        school_memberships.school_id::text = ANY(
          SELECT jsonb_array_elements_text(sp.permission_value->'schools')
        )
      )
  )
);
-- Adicionar política RLS para secretárias verem escolas das suas permissões
CREATE POLICY "Secretarias can view schools from their permissions"
ON public.schools
FOR SELECT
TO authenticated
USING (
  -- Permite ver escola se ela está listada nas permissões da secretária
  EXISTS (
    SELECT 1 
    FROM secretaria_permissions sp
    WHERE sp.secretaria_id = auth.uid()
      AND sp.permission_key = 'manage_all_schools'
      AND (
        -- Permissão total (todas as escolas)
        (sp.permission_value->>'schools' = '*')
        OR
        -- Permissão específica (escola listada no array)
        (schools.id::text = ANY(
          SELECT jsonb_array_elements_text(sp.permission_value->'schools')
        ))
      )
  )
  AND has_role(auth.uid(), 'secretaria'::app_role)
);
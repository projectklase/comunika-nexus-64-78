-- =====================================================
-- FIX: Adicionar verificação de secretaria_permissions
-- na função user_has_school_access para secretárias multi-escola
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_school_access(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Verificação original: school_memberships
    SELECT 1
    FROM public.school_memberships
    WHERE user_id = _user_id
      AND school_id = _school_id
  )
  OR EXISTS (
    -- Nova verificação: secretaria_permissions
    SELECT 1 
    FROM public.secretaria_permissions sp
    WHERE sp.secretaria_id = _user_id
      AND sp.permission_key = 'manage_all_schools'
      AND (
        -- Permissão total (todas as escolas): "*"
        sp.permission_value->>'schools' = '*'
        OR
        -- Escola específica listada no array
        _school_id::text = ANY(
          SELECT jsonb_array_elements_text(sp.permission_value->'schools')
        )
      )
  )
$$;
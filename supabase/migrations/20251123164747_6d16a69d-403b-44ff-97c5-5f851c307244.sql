-- ============================================
-- RPC Function: Métricas de Vínculos Familiares
-- ============================================
-- Esta função calcula métricas de famílias para administradores
-- com segurança RLS e multi-tenancy integrados

CREATE OR REPLACE FUNCTION public.get_family_metrics(school_id_param UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_families INT;
  v_multi_student_families INT;
  v_avg_students_per_family NUMERIC;
  v_top_guardians JSONB;
  v_relationship_distribution JSONB;
BEGIN
  -- ✅ Validação de role administrador
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'administrador'::app_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar métricas familiares';
  END IF;
  
  -- ✅ Validação de parâmetro obrigatório
  IF school_id_param IS NULL THEN
    RAISE EXCEPTION 'school_id_param é obrigatório';
  END IF;

  -- ✅ Calcular famílias totais (agrupadas por email ou telefone do responsável)
  WITH guardian_families AS (
    SELECT 
      COALESCE(g.email, g.phone) as family_key,
      COUNT(DISTINCT g.student_id) as student_count,
      ARRAY_AGG(DISTINCT p.name) as student_names,
      MAX(g.name) as guardian_name,
      MAX(g.email) as guardian_email,
      MAX(g.phone) as guardian_phone
    FROM guardians g
    INNER JOIN profiles p ON p.id = g.student_id
    INNER JOIN school_memberships sm ON sm.user_id = p.id
    WHERE sm.school_id = school_id_param 
      AND sm.role = 'aluno'
      AND (g.email IS NOT NULL OR g.phone IS NOT NULL)
    GROUP BY COALESCE(g.email, g.phone)
  )
  SELECT 
    COUNT(*) INTO v_total_families
  FROM guardian_families;

  -- ✅ Famílias com múltiplos alunos
  SELECT 
    COUNT(*) INTO v_multi_student_families
  FROM (
    SELECT 
      COALESCE(g.email, g.phone) as family_key,
      COUNT(DISTINCT g.student_id) as student_count
    FROM guardians g
    INNER JOIN profiles p ON p.id = g.student_id
    INNER JOIN school_memberships sm ON sm.user_id = p.id
    WHERE sm.school_id = school_id_param 
      AND sm.role = 'aluno'
      AND (g.email IS NOT NULL OR g.phone IS NOT NULL)
    GROUP BY COALESCE(g.email, g.phone)
    HAVING COUNT(DISTINCT g.student_id) > 1
  ) multi_families;

  -- ✅ Média de alunos por família
  SELECT 
    COALESCE(ROUND(AVG(student_count), 2), 0) INTO v_avg_students_per_family
  FROM (
    SELECT 
      COALESCE(g.email, g.phone) as family_key,
      COUNT(DISTINCT g.student_id) as student_count
    FROM guardians g
    INNER JOIN profiles p ON p.id = g.student_id
    INNER JOIN school_memberships sm ON sm.user_id = p.id
    WHERE sm.school_id = school_id_param 
      AND sm.role = 'aluno'
      AND (g.email IS NOT NULL OR g.phone IS NOT NULL)
    GROUP BY COALESCE(g.email, g.phone)
  ) families;

  -- ✅ Top 10 responsáveis mais recorrentes
  SELECT COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'name', guardian_name,
        'email', guardian_email,
        'phone', guardian_phone,
        'student_count', student_count,
        'students', student_names
      ) ORDER BY student_count DESC
    ),
    '[]'::jsonb
  ) INTO v_top_guardians
  FROM (
    SELECT 
      MAX(g.name) as guardian_name,
      g.email as guardian_email,
      g.phone as guardian_phone,
      COUNT(DISTINCT g.student_id) as student_count,
      ARRAY_AGG(DISTINCT p.name ORDER BY p.name) as student_names
    FROM guardians g
    INNER JOIN profiles p ON p.id = g.student_id
    INNER JOIN school_memberships sm ON sm.user_id = p.id
    WHERE sm.school_id = school_id_param 
      AND sm.role = 'aluno'
      AND (g.email IS NOT NULL OR g.phone IS NOT NULL)
    GROUP BY g.email, g.phone
    HAVING COUNT(DISTINCT g.student_id) > 1
    ORDER BY student_count DESC
    LIMIT 10
  ) top_g;

  -- ✅ Distribuição de parentescos registrados em student_notes
  SELECT COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'relationship_type', relationship_type,
        'count', relationship_count
      ) ORDER BY relationship_count DESC
    ),
    '[]'::jsonb
  ) INTO v_relationship_distribution
  FROM (
    SELECT 
      COALESCE(
        relationship->>'relationshipType',
        'NOT_REGISTERED'
      ) as relationship_type,
      COUNT(*) as relationship_count
    FROM (
      SELECT 
        p.id,
        JSONB_ARRAY_ELEMENTS(
          COALESCE(
            (p.student_notes::jsonb)->'familyRelationships',
            '[]'::jsonb
          )
        ) as relationship
      FROM profiles p
      INNER JOIN school_memberships sm ON sm.user_id = p.id
      WHERE sm.school_id = school_id_param 
        AND sm.role = 'aluno'
        AND p.student_notes IS NOT NULL
        AND p.student_notes != ''
        AND p.student_notes::jsonb ? 'familyRelationships'
    ) parsed_notes
    WHERE relationship IS NOT NULL
    GROUP BY relationship_type
  ) dist;

  -- ✅ Retornar todas as métricas em um único JSONB
  RETURN JSONB_BUILD_OBJECT(
    'total_families', COALESCE(v_total_families, 0),
    'multi_student_families', COALESCE(v_multi_student_families, 0),
    'avg_students_per_family', COALESCE(v_avg_students_per_family, 0),
    'top_guardians', COALESCE(v_top_guardians, '[]'::jsonb),
    'relationship_distribution', COALESCE(v_relationship_distribution, '[]'::jsonb)
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao processar métricas familiares: %', SQLERRM
      USING HINT = 'Verifique os logs do servidor para mais detalhes';
END;
$$;
CREATE OR REPLACE FUNCTION public.validate_student_creation(p_school_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id UUID;
  v_limits JSONB;
BEGIN
  -- Buscar admin da escola
  SELECT user_id INTO v_admin_id
  FROM school_memberships
  WHERE school_id = p_school_id
  AND role = 'administrador'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_create', false,
      'message', 'Administrador da escola não encontrado',
      'current_students', 0,
      'max_students', 0,
      'students_remaining', 0
    );
  END IF;

  -- Verificar limites usando a função existente
  v_limits := check_subscription_limits(v_admin_id);

  IF NOT (v_limits->>'can_add_students')::boolean THEN
    RETURN jsonb_build_object(
      'can_create', false,
      'message', format(
        'Limite de %s alunos atingido. Faça upgrade do plano para adicionar mais alunos.',
        v_limits->>'max_students'
      ),
      'current_students', v_limits->'current_students',
      'max_students', v_limits->'max_students',
      'students_remaining', v_limits->'students_remaining'
    );
  END IF;

  -- SEMPRE retorna os campos de limite, mesmo quando pode criar
  RETURN jsonb_build_object(
    'can_create', true,
    'message', 'Você pode adicionar mais alunos',
    'current_students', v_limits->'current_students',
    'max_students', v_limits->'max_students',
    'students_remaining', v_limits->'students_remaining'
  );
END;
$function$;
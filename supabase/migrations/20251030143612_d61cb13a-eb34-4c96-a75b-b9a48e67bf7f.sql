-- Função para atribuir desafios aos alunos
CREATE OR REPLACE FUNCTION public.assign_challenge_to_students(p_challenge_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge RECORD;
  v_student_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_count INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  -- Buscar informações do desafio
  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Iterar sobre todos os alunos ativos
  FOR v_student_id IN 
    SELECT DISTINCT p.id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'aluno'::app_role
      AND p.is_active = true
  LOOP
    -- Verificar se já existe um desafio ativo ou completo para este aluno
    SELECT EXISTS(
      SELECT 1 FROM public.student_challenges
      WHERE student_id = v_student_id
        AND challenge_id = p_challenge_id
        AND status IN ('IN_PROGRESS', 'COMPLETED')
    ) INTO v_exists;
    
    -- Se já existe, pular
    IF v_exists THEN
      CONTINUE;
    END IF;
    
    -- Calcular data de expiração baseado no tipo
    IF v_challenge.type = 'DAILY' THEN
      v_expires_at := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
    ELSIF v_challenge.type = 'WEEKLY' THEN
      -- Próxima segunda-feira às 00:00
      v_expires_at := (CURRENT_DATE + ((8 - EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER) % 7) * INTERVAL '1 day')::TIMESTAMPTZ;
    ELSE
      -- ACHIEVEMENT não expira
      v_expires_at := NULL;
    END IF;
    
    -- Inserir desafio para o aluno
    INSERT INTO public.student_challenges (
      student_id,
      challenge_id,
      status,
      current_progress,
      started_at,
      expires_at
    ) VALUES (
      v_student_id,
      p_challenge_id,
      'IN_PROGRESS',
      0,
      NOW(),
      v_expires_at
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$function$;

-- Trigger para atribuir desafios automaticamente quando criados ou ativados
CREATE OR REPLACE FUNCTION public.on_challenge_activated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assigned_count INTEGER;
BEGIN
  -- Se o desafio foi ativado (inserido como ativo ou atualizado para ativo)
  IF NEW.is_active = true AND (TG_OP = 'INSERT' OR OLD.is_active = false) THEN
    -- Atribuir para todos os alunos
    SELECT assign_challenge_to_students(NEW.id) INTO v_assigned_count;
    
    RAISE NOTICE 'Desafio % atribuído a % alunos', NEW.title, v_assigned_count;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_on_challenge_activated ON public.challenges;
CREATE TRIGGER trigger_on_challenge_activated
  AFTER INSERT OR UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.on_challenge_activated();

-- Atribuição retroativa: atribuir os 4 desafios seed existentes a todos os alunos
DO $$
DECLARE
  v_challenge RECORD;
  v_assigned_count INTEGER;
BEGIN
  FOR v_challenge IN 
    SELECT id, title 
    FROM public.challenges 
    WHERE is_active = true
  LOOP
    SELECT assign_challenge_to_students(v_challenge.id) INTO v_assigned_count;
    RAISE NOTICE 'Desafio "%" atribuído retroativamente a % alunos', v_challenge.title, v_assigned_count;
  END LOOP;
END;
$$;
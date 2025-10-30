-- =====================================================
-- FASE 2: Integração de Desafios com Automação
-- =====================================================

-- 1. CRIAR TABELA post_reads
CREATE TABLE IF NOT EXISTS public.post_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_reads_post ON public.post_reads(post_id);
CREATE INDEX idx_post_reads_user ON public.post_reads(user_id);
CREATE INDEX idx_post_reads_date ON public.post_reads(read_at);

ALTER TABLE public.post_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem registrar suas próprias leituras"
  ON public.post_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem ver suas próprias leituras"
  ON public.post_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Professores/Secretaria podem ver todas as leituras"
  ON public.post_reads FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'professor'::app_role) OR 
    has_role(auth.uid(), 'secretaria'::app_role)
  );

-- 2. FUNÇÃO PARA COMPLETAR DESAFIOS E RECOMPENSAR
CREATE OR REPLACE FUNCTION complete_challenge_and_reward(
  p_student_id UUID,
  p_student_challenge_id UUID,
  p_koin_reward INTEGER,
  p_challenge_title TEXT
)
RETURNS VOID AS $$
DECLARE
  v_student_balance INTEGER;
BEGIN
  SELECT koins INTO v_student_balance
  FROM public.profiles
  WHERE id = p_student_id;
  
  UPDATE public.student_challenges
  SET 
    status = 'COMPLETED',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_student_challenge_id;
  
  INSERT INTO public.koin_transactions (
    user_id,
    type,
    amount,
    description,
    related_entity_id,
    balance_before,
    balance_after
  ) VALUES (
    p_student_id,
    'BONUS',
    p_koin_reward,
    'Desafio Concluído: ' || p_challenge_title,
    NULL,
    v_student_balance,
    v_student_balance + p_koin_reward
  );
  
  UPDATE public.profiles
  SET koins = koins + p_koin_reward
  WHERE id = p_student_id;
  
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    role_target,
    link,
    is_read,
    meta
  ) VALUES (
    p_student_id,
    'KOIN_BONUS',
    'Desafio Concluído! 🎉',
    'Você ganhou ' || p_koin_reward || ' Koins ao completar: ' || p_challenge_title,
    'aluno',
    '/aluno/nexus',
    false,
    jsonb_build_object(
      'koinAmount', p_koin_reward,
      'challengeTitle', p_challenge_title,
      'source', 'challenge_system'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. TRIGGER PARA "LER POST"
CREATE OR REPLACE FUNCTION handle_post_read_challenge()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  SELECT 
    sc.id AS student_challenge_id,
    c.id AS challenge_id,
    c.title,
    c.koin_reward,
    c.action_count,
    sc.current_progress
  INTO v_challenge
  FROM public.student_challenges sc
  JOIN public.challenges c ON sc.challenge_id = c.id
  WHERE sc.student_id = NEW.user_id
    AND c.action_target = 'READ_POST'
    AND sc.status = 'IN_PROGRESS'
  ORDER BY c.koin_reward DESC
  LIMIT 1;
  
  IF FOUND THEN
    UPDATE public.student_challenges
    SET 
      current_progress = current_progress + 1,
      updated_at = NOW()
    WHERE id = v_challenge.student_challenge_id;
    
    IF (v_challenge.current_progress + 1) >= v_challenge.action_count THEN
      PERFORM complete_challenge_and_reward(
        NEW.user_id,
        v_challenge.student_challenge_id,
        v_challenge.koin_reward,
        v_challenge.title
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_post_read_check_challenge
  AFTER INSERT ON public.post_reads
  FOR EACH ROW
  EXECUTE FUNCTION handle_post_read_challenge();

-- 4. TRIGGER PARA "ENTREGAR ATIVIDADE"
CREATE OR REPLACE FUNCTION handle_delivery_challenge()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  IF (NEW.review_status = 'APROVADA' AND (OLD.review_status IS NULL OR OLD.review_status != 'APROVADA')) THEN
    
    SELECT 
      sc.id AS student_challenge_id,
      c.id AS challenge_id,
      c.title,
      c.koin_reward,
      c.action_count,
      sc.current_progress
    INTO v_challenge
    FROM public.student_challenges sc
    JOIN public.challenges c ON sc.challenge_id = c.id
    WHERE sc.student_id = NEW.student_id
      AND c.action_target = 'SUBMIT_ACTIVITY'
      AND sc.status = 'IN_PROGRESS'
    ORDER BY c.koin_reward DESC
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE public.student_challenges
      SET 
        current_progress = current_progress + 1,
        updated_at = NOW()
      WHERE id = v_challenge.student_challenge_id;
      
      IF (v_challenge.current_progress + 1) >= v_challenge.action_count THEN
        PERFORM complete_challenge_and_reward(
          NEW.student_id,
          v_challenge.student_challenge_id,
          v_challenge.koin_reward,
          v_challenge.title
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_delivery_approved_check_challenge
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION handle_delivery_challenge();

-- 5. RPC PARA BUSCAR DESAFIOS DO ALUNO
CREATE OR REPLACE FUNCTION get_student_challenges_with_progress(p_student_id UUID)
RETURNS TABLE (
  challenge_id UUID,
  student_challenge_id UUID,
  title TEXT,
  description TEXT,
  koin_reward INTEGER,
  challenge_type TEXT,
  action_target TEXT,
  action_count INTEGER,
  current_progress INTEGER,
  status TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  icon_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS challenge_id,
    sc.id AS student_challenge_id,
    c.title,
    c.description,
    c.koin_reward,
    c.type AS challenge_type,
    c.action_target,
    c.action_count,
    sc.current_progress,
    sc.status,
    sc.started_at,
    sc.expires_at,
    c.icon_name
  FROM public.student_challenges sc
  JOIN public.challenges c ON sc.challenge_id = c.id
  WHERE sc.student_id = p_student_id
    AND sc.status IN ('IN_PROGRESS', 'COMPLETED')
    AND (sc.expires_at IS NULL OR sc.expires_at > NOW())
  ORDER BY 
    CASE WHEN sc.status = 'IN_PROGRESS' THEN 0 ELSE 1 END,
    c.koin_reward DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
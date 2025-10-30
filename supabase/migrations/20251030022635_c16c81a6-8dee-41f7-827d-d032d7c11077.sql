-- =====================================================
-- MIGRATION: Sistema de Desafios (Challenges)
-- Objetivo: Gamificar o engajamento do aluno com recompensas de Koins
-- =====================================================

-- Tabela: challenges
-- Armazena os desafios disponíveis no sistema
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  koin_reward INTEGER NOT NULL CHECK (koin_reward > 0),
  type TEXT NOT NULL CHECK (type IN ('DAILY', 'WEEKLY', 'ACHIEVEMENT')),
  action_target TEXT NOT NULL CHECK (action_target IN ('READ_POST', 'SUBMIT_ACTIVITY', 'LOGIN_STREAK', 'PERFECT_WEEK')),
  action_count INTEGER NOT NULL DEFAULT 1 CHECK (action_count > 0),
  icon_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: student_challenges
-- Rastreia o progresso de cada aluno em cada desafio
CREATE TABLE IF NOT EXISTS public.student_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'EXPIRED')),
  current_progress INTEGER NOT NULL DEFAULT 0 CHECK (current_progress >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, challenge_id, started_at)
);

-- Índices para performance
CREATE INDEX idx_challenges_type ON public.challenges(type);
CREATE INDEX idx_challenges_active ON public.challenges(is_active);
CREATE INDEX idx_student_challenges_student ON public.student_challenges(student_id);
CREATE INDEX idx_student_challenges_status ON public.student_challenges(status);
CREATE INDEX idx_student_challenges_expires ON public.student_challenges(expires_at);

-- Trigger: Atualizar updated_at
CREATE OR REPLACE FUNCTION update_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_challenges_updated_at();

CREATE TRIGGER trigger_student_challenges_updated_at
  BEFORE UPDATE ON public.student_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_challenges_updated_at();

-- RLS Policies: challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alunos podem ver desafios ativos"
  ON public.challenges
  FOR SELECT
  TO authenticated
  USING (is_active = true AND has_role(auth.uid(), 'aluno'::app_role));

CREATE POLICY "Secretaria pode gerenciar desafios"
  ON public.challenges
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'secretaria'::app_role))
  WITH CHECK (has_role(auth.uid(), 'secretaria'::app_role));

-- RLS Policies: student_challenges
ALTER TABLE public.student_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alunos podem ver seus próprios desafios"
  ON public.student_challenges
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Sistema pode criar desafios para alunos"
  ON public.student_challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid() OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Sistema pode atualizar progresso de desafios"
  ON public.student_challenges
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() OR has_role(auth.uid(), 'secretaria'::app_role))
  WITH CHECK (student_id = auth.uid() OR has_role(auth.uid(), 'secretaria'::app_role));

-- Seed: Desafios iniciais
INSERT INTO public.challenges (title, description, koin_reward, type, action_target, action_count, icon_name) VALUES
  ('Leitor Ativo', 'Leia 1 post novo no Feed hoje', 20, 'DAILY', 'READ_POST', 1, 'BookOpen'),
  ('Entrega em Dia', 'Entregue 1 atividade dentro do prazo hoje', 50, 'DAILY', 'SUBMIT_ACTIVITY', 1, 'CheckCircle'),
  ('Semana Perfeita', 'Complete todas as atividades da semana', 200, 'WEEKLY', 'PERFECT_WEEK', 1, 'Trophy'),
  ('Fogo na Leitura', 'Leia 5 posts esta semana', 100, 'WEEKLY', 'READ_POST', 5, 'Flame');

-- Comentários para documentação
COMMENT ON TABLE public.challenges IS 'Desafios disponíveis para gamificação';
COMMENT ON TABLE public.student_challenges IS 'Progresso de cada aluno em cada desafio';
COMMENT ON COLUMN public.challenges.type IS 'DAILY: Renovado todo dia | WEEKLY: Renovado toda semana | ACHIEVEMENT: Único e permanente';
COMMENT ON COLUMN public.challenges.action_target IS 'Ação que o aluno deve realizar para completar o desafio';
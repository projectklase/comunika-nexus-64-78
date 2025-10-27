-- ====================================================================
-- FASE 1: Modificações no Sistema de Convites e Confirmações de Eventos
-- ====================================================================

-- ====================================================================
-- PARTE 1: Atualizar tabela event_invitations
-- ====================================================================

-- 1. Adicionar coluna friend_contact (inicialmente nullable)
ALTER TABLE public.event_invitations 
ADD COLUMN friend_contact TEXT;

-- 2. Popular friend_contact com dados existentes de parent_contact
UPDATE public.event_invitations 
SET friend_contact = parent_contact 
WHERE friend_contact IS NULL;

-- 3. Tornar friend_contact NOT NULL após popular dados
ALTER TABLE public.event_invitations 
ALTER COLUMN friend_contact SET NOT NULL;

-- 4. Tornar parent_name NULLABLE (opcional)
ALTER TABLE public.event_invitations 
ALTER COLUMN parent_name DROP NOT NULL;

-- 5. Tornar parent_contact NULLABLE (opcional)
ALTER TABLE public.event_invitations 
ALTER COLUMN parent_contact DROP NOT NULL;

-- 6. Adicionar comentários de documentação
COMMENT ON COLUMN public.event_invitations.friend_contact IS 'Telefone do amigo convidado (obrigatório)';
COMMENT ON COLUMN public.event_invitations.parent_name IS 'Nome do responsável pelo amigo (opcional)';
COMMENT ON COLUMN public.event_invitations.parent_contact IS 'Contato do responsável (opcional)';

-- ====================================================================
-- PARTE 2: Criar tabela event_confirmations
-- ====================================================================

-- 1. Criar tabela de confirmações de presença
CREATE TABLE public.event_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_confirmations_unique UNIQUE(event_id, student_id)
);

-- 2. Criar índices para performance
CREATE INDEX idx_event_confirmations_event_id ON public.event_confirmations(event_id);
CREATE INDEX idx_event_confirmations_student_id ON public.event_confirmations(student_id);

-- 3. Adicionar comentários de documentação
COMMENT ON TABLE public.event_confirmations IS 'Confirmações de presença dos alunos em eventos';
COMMENT ON COLUMN public.event_confirmations.id IS 'Identificador único da confirmação';
COMMENT ON COLUMN public.event_confirmations.event_id IS 'Referência ao evento (post)';
COMMENT ON COLUMN public.event_confirmations.student_id IS 'Referência ao aluno que confirmou';
COMMENT ON COLUMN public.event_confirmations.confirmed_at IS 'Data e hora da confirmação';

-- ====================================================================
-- PARTE 3: Habilitar RLS e criar políticas para event_confirmations
-- ====================================================================

-- 1. Habilitar Row Level Security
ALTER TABLE public.event_confirmations ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Alunos podem confirmar sua própria presença (INSERT)
CREATE POLICY "Alunos podem confirmar presença"
  ON public.event_confirmations 
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- 3. Policy: Alunos podem ver suas próprias confirmações (SELECT)
CREATE POLICY "Alunos podem ver suas confirmações"
  ON public.event_confirmations 
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- 4. Policy: Alunos podem remover suas próprias confirmações (DELETE)
CREATE POLICY "Alunos podem remover suas confirmações"
  ON public.event_confirmations 
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

-- 5. Policy: Secretaria pode ver todas as confirmações (SELECT)
CREATE POLICY "Secretaria pode ver todas confirmações"
  ON public.event_confirmations 
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'secretaria'::app_role));
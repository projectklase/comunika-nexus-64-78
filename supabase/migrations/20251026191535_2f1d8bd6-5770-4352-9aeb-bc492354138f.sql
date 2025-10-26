-- ============================================
-- Funcionalidade "Convidar Amigos" para Eventos
-- ============================================

-- 1. Adicionar coluna para habilitar convites em eventos
ALTER TABLE public.posts 
ADD COLUMN allow_invitations boolean DEFAULT false;

COMMENT ON COLUMN public.posts.allow_invitations IS 
'Indica se o evento permite que alunos convidem amigos externos (funcionalidade de captação de leads)';

-- 2. Criar tabela para armazenar leads de amigos convidados
CREATE TABLE public.event_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  inviting_student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_name text NOT NULL,
  parent_name text NOT NULL,
  parent_contact text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Constraints para garantir qualidade dos dados
  CONSTRAINT friend_name_not_empty CHECK (char_length(trim(friend_name)) > 0),
  CONSTRAINT parent_name_not_empty CHECK (char_length(trim(parent_name)) > 0),
  CONSTRAINT parent_contact_not_empty CHECK (char_length(trim(parent_contact)) > 0)
);

-- 3. Índices para performance
CREATE INDEX idx_event_invitations_event_id ON public.event_invitations(event_id);
CREATE INDEX idx_event_invitations_student_id ON public.event_invitations(inviting_student_id);
CREATE INDEX idx_event_invitations_created_at ON public.event_invitations(created_at DESC);

-- 4. Comentários
COMMENT ON TABLE public.event_invitations IS 'Armazena leads de amigos convidados para eventos escolares pelos alunos';
COMMENT ON COLUMN public.event_invitations.event_id IS 'ID do evento (post) para o qual o amigo foi convidado';
COMMENT ON COLUMN public.event_invitations.inviting_student_id IS 'ID do aluno que fez o convite';
COMMENT ON COLUMN public.event_invitations.friend_name IS 'Nome do amigo convidado';
COMMENT ON COLUMN public.event_invitations.parent_name IS 'Nome do responsável pelo amigo';
COMMENT ON COLUMN public.event_invitations.parent_contact IS 'Telefone ou email do responsável';

-- 5. Habilitar RLS
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

-- 6. Política: Alunos podem inserir convites APENAS para eventos permitidos
CREATE POLICY "Alunos podem criar convites para eventos permitidos"
ON public.event_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Aluno só pode inserir com seu próprio ID
  auth.uid() = inviting_student_id
  AND
  -- Evento deve ter allow_invitations = true
  EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = event_invitations.event_id
      AND posts.type = 'EVENTO'
      AND posts.allow_invitations = true
      AND posts.status = 'PUBLISHED'
  )
);

-- 7. Política: Alunos podem ver seus próprios convites
CREATE POLICY "Alunos podem ver seus próprios convites"
ON public.event_invitations
FOR SELECT
TO authenticated
USING (auth.uid() = inviting_student_id);

-- 8. Política: Secretaria pode gerenciar todos os convites
CREATE POLICY "Secretaria pode gerenciar todos os convites"
ON public.event_invitations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'secretaria'::app_role));
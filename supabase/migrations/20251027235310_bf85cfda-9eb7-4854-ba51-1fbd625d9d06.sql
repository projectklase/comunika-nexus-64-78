-- Adicionar coluna friend_dob à tabela event_invitations
ALTER TABLE public.event_invitations
ADD COLUMN friend_dob DATE NOT NULL DEFAULT '2000-01-01';

-- Remover default após adicionar (coluna já existe com valores padrão)
ALTER TABLE public.event_invitations
ALTER COLUMN friend_dob DROP DEFAULT;

-- Adicionar constraint: data de nascimento não pode ser no futuro
ALTER TABLE public.event_invitations
ADD CONSTRAINT check_friend_dob_not_future 
CHECK (friend_dob <= CURRENT_DATE);

-- Adicionar constraint: data de nascimento deve ser razoável (após 1900)
ALTER TABLE public.event_invitations
ADD CONSTRAINT check_friend_dob_reasonable 
CHECK (friend_dob >= '1900-01-01');

-- Adicionar comentário descritivo
COMMENT ON COLUMN public.event_invitations.friend_dob IS 'Data de nascimento do amigo convidado (formato: YYYY-MM-DD)';
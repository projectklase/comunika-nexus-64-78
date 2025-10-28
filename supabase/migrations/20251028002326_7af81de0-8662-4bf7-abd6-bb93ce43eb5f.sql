-- Tornar friend_contact nullable para permitir convites de menores de idade sem telefone próprio
ALTER TABLE public.event_invitations 
ALTER COLUMN friend_contact DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.event_invitations.friend_contact IS 
'Telefone do amigo convidado - obrigatório apenas para maiores de 18 anos';

-- Constraint de validação lógica (opcional - descomentada para uso)
-- Esta constraint garante que maiores de 18 anos tenham telefone preenchido
-- ALTER TABLE public.event_invitations
-- ADD CONSTRAINT check_contact_for_adults
-- CHECK (
--   (EXTRACT(YEAR FROM AGE(CURRENT_DATE, friend_dob)) >= 18 AND friend_contact IS NOT NULL)
--   OR
--   (EXTRACT(YEAR FROM AGE(CURRENT_DATE, friend_dob)) < 18)
-- );
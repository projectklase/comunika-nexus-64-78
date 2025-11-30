-- Alterar constraint para incluir 'FREE' como tipo de pacote válido

-- Remover constraint existente
ALTER TABLE public.card_packs 
  DROP CONSTRAINT IF EXISTS card_packs_pack_type_check;

-- Criar nova constraint com FREE incluído
ALTER TABLE public.card_packs 
  ADD CONSTRAINT card_packs_pack_type_check 
  CHECK (pack_type IN ('BASIC', 'RARE', 'EPIC', 'LEGENDARY', 'FREE'));
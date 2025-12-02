-- Tornar colunas de deck nullable na tabela battles
ALTER TABLE public.battles 
  ALTER COLUMN player1_deck_id DROP NOT NULL,
  ALTER COLUMN player2_deck_id DROP NOT NULL;

-- Remover FKs antigas e recriar com ON DELETE SET NULL
ALTER TABLE public.battles 
  DROP CONSTRAINT IF EXISTS battles_player1_deck_id_fkey,
  DROP CONSTRAINT IF EXISTS battles_player2_deck_id_fkey;

ALTER TABLE public.battles
  ADD CONSTRAINT battles_player1_deck_id_fkey 
    FOREIGN KEY (player1_deck_id) REFERENCES public.decks(id) ON DELETE SET NULL,
  ADD CONSTRAINT battles_player2_deck_id_fkey 
    FOREIGN KEY (player2_deck_id) REFERENCES public.decks(id) ON DELETE SET NULL;
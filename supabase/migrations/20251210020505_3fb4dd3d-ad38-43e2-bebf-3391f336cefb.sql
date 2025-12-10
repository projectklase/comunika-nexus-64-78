-- FASE 1: Remover trigger duplicado que pode causar recompensa dupla
DROP TRIGGER IF EXISTS on_post_read_check_challenge ON post_reads;

-- FASE 4: Criar tabela post_saves para persistir posts salvos
CREATE TABLE IF NOT EXISTS public.post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

-- RLS: Usuários podem ver/gerenciar apenas seus próprios posts salvos
CREATE POLICY "Users can view their own saved posts"
ON public.post_saves FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
ON public.post_saves FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
ON public.post_saves FOR DELETE
USING (auth.uid() = user_id);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_post_saves_user_id ON public.post_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_post_id ON public.post_saves(post_id);
-- Adiciona a coluna para controlar anexos nas atividades
ALTER TABLE public.posts
ADD COLUMN allow_attachments BOOLEAN DEFAULT false NOT NULL;

-- Comentário para clareza
COMMENT ON COLUMN public.posts.allow_attachments IS 'Controla se os alunos podem enviar anexos. Default FALSE para economizar armazenamento.';
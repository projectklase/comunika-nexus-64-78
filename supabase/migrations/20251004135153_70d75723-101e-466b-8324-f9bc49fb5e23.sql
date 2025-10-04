-- Criar tabela posts
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  attachments JSONB,
  class_id TEXT, -- deprecated, use class_ids
  class_ids TEXT[],
  due_at TIMESTAMPTZ,
  event_start_at TIMESTAMPTZ,
  event_end_at TIMESTAMPTZ,
  event_location TEXT,
  audience TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  author_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'PUBLISHED',
  publish_at TIMESTAMPTZ,
  activity_meta JSONB,
  meta JSONB
);

-- Índices para performance
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_type ON public.posts(type);
CREATE INDEX idx_posts_audience ON public.posts(audience);
CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_class_ids ON public.posts USING GIN(class_ids);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_publish_at ON public.posts(publish_at) WHERE status = 'SCHEDULED';

-- Habilitar RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Secretaria pode fazer tudo
CREATE POLICY "Secretaria pode gerenciar todos os posts"
ON public.posts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'secretaria'
  )
);

-- Professores podem ver posts PUBLISHED
CREATE POLICY "Professores podem ver posts publicados"
ON public.posts
FOR SELECT
TO authenticated
USING (
  status = 'PUBLISHED'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'professor'
  )
);

-- Professores podem criar posts
CREATE POLICY "Professores podem criar posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'professor'
  )
  AND author_id = auth.uid()
);

-- Professores podem editar seus próprios posts
CREATE POLICY "Professores podem editar seus próprios posts"
ON public.posts
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'professor'
  )
);

-- Professores podem deletar seus próprios posts
CREATE POLICY "Professores podem deletar seus próprios posts"
ON public.posts
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'professor'
  )
);

-- Alunos podem ver posts PUBLISHED de suas turmas ou globais
CREATE POLICY "Alunos podem ver posts publicados"
ON public.posts
FOR SELECT
TO authenticated
USING (
  status = 'PUBLISHED'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'aluno'
  )
  AND (
    audience = 'GLOBAL'
    OR (
      audience = 'CLASS'
      AND EXISTS (
        SELECT 1 FROM class_students
        WHERE class_students.student_id = auth.uid()
        AND class_students.class_id::text = ANY(class_ids)
      )
    )
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
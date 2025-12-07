-- Remover policy antiga que limita professores a apenas posts PUBLISHED
DROP POLICY IF EXISTS "Professores podem ver posts publicados" ON posts;

-- Criar nova policy que permite professores ver:
-- 1. Seus próprios posts (qualquer status) - para poder gerenciar/deletar
-- 2. Posts publicados de outros
CREATE POLICY "Professores podem ver posts" ON posts
  FOR SELECT
  USING (
    has_role(auth.uid(), 'professor'::app_role) AND (
      -- Pode ver seus próprios posts (qualquer status)
      author_id = auth.uid()
      OR
      -- Pode ver posts publicados de outros
      status = 'PUBLISHED'
    )
  );
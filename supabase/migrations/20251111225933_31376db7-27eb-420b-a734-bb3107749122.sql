-- Fase 1: Corrigir posts órfãos (atribuir à primeira escola ativa)
UPDATE posts 
SET school_id = (SELECT id FROM schools WHERE is_active = true ORDER BY created_at ASC LIMIT 1)
WHERE school_id IS NULL;

-- Fase 1: Adicionar constraint NOT NULL
ALTER TABLE posts 
ALTER COLUMN school_id SET NOT NULL;

-- Fase 2: Remover policy permissiva global que ignora filtro de escola
DROP POLICY IF EXISTS "Usuários autenticados podem ver posts publicados" ON posts;

-- Fase 6: Adicionar constraint de validação
ALTER TABLE posts 
ADD CONSTRAINT posts_school_id_required 
CHECK (school_id IS NOT NULL);

-- Fase 6: Criar função de validação de school_id
CREATE OR REPLACE FUNCTION public.validate_post_school_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    RAISE EXCEPTION 'Post deve ter uma escola associada (school_id não pode ser NULL)';
  END IF;
  
  -- Validar que a escola existe e está ativa
  IF NOT EXISTS (
    SELECT 1 FROM schools 
    WHERE id = NEW.school_id 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Escola inválida ou inativa: %', NEW.school_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fase 6: Criar trigger para validar school_id em insert/update
DROP TRIGGER IF EXISTS posts_validate_school_id ON posts;
CREATE TRIGGER posts_validate_school_id
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_post_school_id();
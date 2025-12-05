-- Função para validar quantidade mínima de ações por tipo de desafio
-- Previne exploits como "500 XP com 1 ação"
CREATE OR REPLACE FUNCTION public.validate_challenge_action_count()
RETURNS TRIGGER AS $$
DECLARE
  min_count INTEGER;
BEGIN
  -- Definir quantidade mínima por tipo
  CASE NEW.type
    WHEN 'DAILY' THEN min_count := 1;
    WHEN 'WEEKLY' THEN min_count := 5;
    WHEN 'ACHIEVEMENT' THEN min_count := 15;
    ELSE min_count := 1;
  END CASE;
  
  -- Validar quantidade mínima
  IF NEW.action_count < min_count THEN
    RAISE EXCEPTION 'Desafios % requerem no mínimo % ações. Recebido: %', 
      NEW.type, min_count, NEW.action_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger para validar quantidade de ações (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_validate_challenge_action_count'
  ) THEN
    CREATE TRIGGER trigger_validate_challenge_action_count
      BEFORE INSERT OR UPDATE ON public.challenges
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_challenge_action_count();
  END IF;
END;
$$;
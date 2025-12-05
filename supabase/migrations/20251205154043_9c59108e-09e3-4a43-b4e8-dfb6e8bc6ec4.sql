-- =====================================================
-- Validação de limites de XP para desafios
-- Previne inflação de XP e mantém economia equilibrada
-- =====================================================

-- Função de validação de XP no backend
CREATE OR REPLACE FUNCTION public.validate_challenge_xp_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_limit INT;
BEGIN
  -- Definir limites por tipo
  CASE NEW.type
    WHEN 'DAILY' THEN v_xp_limit := 50;
    WHEN 'WEEKLY' THEN v_xp_limit := 200;
    WHEN 'ACHIEVEMENT' THEN v_xp_limit := 500;
    ELSE v_xp_limit := 500; -- Default para tipos futuros
  END CASE;
  
  -- Validar limite de XP
  IF COALESCE(NEW.xp_reward, 0) > v_xp_limit THEN
    RAISE EXCEPTION 'XP reward (%) exceeds limit (%) for challenge type %', 
      NEW.xp_reward, v_xp_limit, NEW.type;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para validação em INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_validate_challenge_xp ON public.challenges;
CREATE TRIGGER trigger_validate_challenge_xp
  BEFORE INSERT OR UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_challenge_xp_limit();

-- Comentário explicativo
COMMENT ON FUNCTION public.validate_challenge_xp_limit() IS 
'Valida limites de XP por tipo de desafio: DAILY=50, WEEKLY=200, ACHIEVEMENT=500. Previne inflação de XP.';
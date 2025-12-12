-- Corrigir RPC check_and_unlock_achievements para usar level_xp (permanente) em vez de total_xp (gastável)
-- Isso garante que desbloqueios nunca sejam "perdidos" quando o aluno gasta XP

DROP FUNCTION IF EXISTS public.check_and_unlock_achievements(uuid);

CREATE FUNCTION public.check_and_unlock_achievements(p_user_id uuid)
RETURNS TABLE(
  unlockable_id uuid,
  unlockable_name text,
  unlockable_type text,
  unlockable_rarity text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_challenges_completed INTEGER;
  v_unlockable RECORD;
  v_newly_unlocked_count INTEGER := 0;
BEGIN
  -- Buscar estatísticas do perfil - USANDO level_xp (permanente) em vez de total_xp (gastável)
  SELECT level_xp, current_streak_days, best_streak_days, koins
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN;
  END IF;

  -- Contar desafios completados
  SELECT COUNT(*)
  INTO v_challenges_completed
  FROM student_challenges
  WHERE student_id = p_user_id AND status = 'COMPLETED';

  -- Usar o melhor streak entre current e best
  v_profile.best_streak_days := GREATEST(
    COALESCE(v_profile.current_streak_days, 0),
    COALESCE(v_profile.best_streak_days, 0)
  );

  -- Iterar sobre todos os unlockables ativos que o usuário ainda não tem
  FOR v_unlockable IN
    SELECT u.*
    FROM unlockables u
    WHERE u.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_unlocks uu
      WHERE uu.user_id = p_user_id AND uu.unlockable_id = u.id
    )
  LOOP
    -- Verificar se o usuário atende a TODOS os requisitos (AND logic)
    -- IMPORTANTE: Usando level_xp (permanente) para verificação
    IF (v_unlockable.required_xp IS NULL OR COALESCE(v_profile.level_xp, 0) >= v_unlockable.required_xp)
       AND (v_unlockable.required_streak_days IS NULL OR v_profile.best_streak_days >= v_unlockable.required_streak_days)
       AND (v_unlockable.required_challenges_completed IS NULL OR v_challenges_completed >= v_unlockable.required_challenges_completed)
       AND (v_unlockable.required_koins_earned IS NULL OR COALESCE(v_profile.koins, 0) >= v_unlockable.required_koins_earned)
    THEN
      -- Desbloquear o item
      INSERT INTO user_unlocks (user_id, unlockable_id, unlocked_at)
      VALUES (p_user_id, v_unlockable.id, now())
      ON CONFLICT (user_id, unlockable_id) DO NOTHING;

      -- Retornar o item desbloqueado
      unlockable_id := v_unlockable.id;
      unlockable_name := v_unlockable.name;
      unlockable_type := v_unlockable.type;
      unlockable_rarity := v_unlockable.rarity;
      RETURN NEXT;
      
      v_newly_unlocked_count := v_newly_unlocked_count + 1;
    END IF;
  END LOOP;

  RETURN;
END;
$$;
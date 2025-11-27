-- Fase 1: Adicionar campos de tracking ao profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak_days INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_streak_days INTEGER DEFAULT 0;

-- Fase 2: Inserir 7 badges iniciais de conquista
INSERT INTO unlockables (type, identifier, name, description, rarity, required_challenges_completed, preview_data, is_active)
VALUES 
  ('BADGE', 'primeiro_passo', 'Primeiro Passo', 'Complete seu primeiro desafio', 'COMMON', 1, '{"emoji": "🎯"}'::jsonb, true),
  ('BADGE', 'fogo_no_streak', 'Fogo no Streak', 'Mantenha 7 dias consecutivos de atividade', 'UNCOMMON', NULL, '{"emoji": "🔥"}'::jsonb, true),
  ('BADGE', 'estudante_ativo', 'Estudante Ativo', 'Acumule 100 XP', 'UNCOMMON', NULL, '{"emoji": "⚡"}'::jsonb, true),
  ('BADGE', 'dedicacao', 'Dedicação', 'Mantenha 15 dias consecutivos de atividade', 'RARE', NULL, '{"emoji": "🌟"}'::jsonb, true),
  ('BADGE', 'mestre_do_xp', 'Mestre do XP', 'Acumule 1000 XP', 'RARE', NULL, '{"emoji": "💎"}'::jsonb, true),
  ('BADGE', 'imparavel', 'Imparável', 'Mantenha 30 dias consecutivos de atividade', 'EPIC', NULL, '{"emoji": "🏆"}'::jsonb, true),
  ('BADGE', 'lendario', 'Lendário', 'Mantenha 50 dias consecutivos + 2500 XP', 'LEGENDARY', NULL, '{"emoji": "👑"}'::jsonb, true);

-- Atualizar badges com critérios de streak
UPDATE unlockables SET required_streak_days = 7 WHERE identifier = 'fogo_no_streak';
UPDATE unlockables SET required_xp = 100 WHERE identifier = 'estudante_ativo';
UPDATE unlockables SET required_streak_days = 15 WHERE identifier = 'dedicacao';
UPDATE unlockables SET required_xp = 1000 WHERE identifier = 'mestre_do_xp';
UPDATE unlockables SET required_streak_days = 30 WHERE identifier = 'imparavel';
UPDATE unlockables SET required_streak_days = 50, required_xp = 2500 WHERE identifier = 'lendario';

-- Função para atualizar tracking de atividade do usuário
CREATE OR REPLACE FUNCTION update_user_activity_tracking()
RETURNS TRIGGER AS $$
DECLARE
  days_diff INTEGER;
BEGIN
  -- Se for uma transação de ganho de Koins (tipo EARN_*)
  IF NEW.type LIKE 'EARN_%' THEN
    -- Atualizar total_xp (1 Koin = 1 XP para simplicidade)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + NEW.amount
    WHERE id = NEW.user_id;
    
    -- Atualizar streak de atividade
    UPDATE profiles 
    SET 
      last_activity_date = CURRENT_DATE,
      current_streak_days = CASE
        WHEN last_activity_date IS NULL THEN 1
        WHEN last_activity_date = CURRENT_DATE THEN current_streak_days
        WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN COALESCE(current_streak_days, 0) + 1
        ELSE 1
      END,
      best_streak_days = GREATEST(
        COALESCE(best_streak_days, 0),
        CASE
          WHEN last_activity_date IS NULL THEN 1
          WHEN last_activity_date = CURRENT_DATE THEN current_streak_days
          WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN COALESCE(current_streak_days, 0) + 1
          ELSE 1
        END
      )
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para tracking automático
DROP TRIGGER IF EXISTS trigger_update_activity_tracking ON koin_transactions;
CREATE TRIGGER trigger_update_activity_tracking
  AFTER INSERT ON koin_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_activity_tracking();

-- Dropar e recriar função check_and_unlock_achievements com retorno JSON
DROP FUNCTION IF EXISTS check_and_unlock_achievements(UUID);

CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_profile RECORD;
  v_unlockable RECORD;
  v_newly_unlocked JSON[] := ARRAY[]::JSON[];
  v_total_challenges_completed INTEGER;
BEGIN
  -- Buscar dados do perfil do usuário
  SELECT total_xp, current_streak_days, best_streak_days
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  -- Contar desafios completados
  SELECT COUNT(*)
  INTO v_total_challenges_completed
  FROM student_challenges
  WHERE student_id = p_user_id AND status = 'COMPLETED';
  
  -- Verificar cada unlockable do tipo BADGE ou THEME ou AVATAR
  FOR v_unlockable IN 
    SELECT * FROM unlockables 
    WHERE is_active = true
  LOOP
    -- Verificar se já está desbloqueado
    IF NOT EXISTS (
      SELECT 1 FROM user_unlocks 
      WHERE user_id = p_user_id AND unlockable_id = v_unlockable.id
    ) THEN
      -- Verificar critérios de desbloqueio
      IF (
        (v_unlockable.required_xp IS NULL OR COALESCE(v_profile.total_xp, 0) >= v_unlockable.required_xp) AND
        (v_unlockable.required_streak_days IS NULL OR COALESCE(v_profile.best_streak_days, 0) >= v_unlockable.required_streak_days) AND
        (v_unlockable.required_challenges_completed IS NULL OR v_total_challenges_completed >= v_unlockable.required_challenges_completed)
      ) THEN
        -- Desbloquear o item
        INSERT INTO user_unlocks (user_id, unlockable_id, unlocked_at)
        VALUES (p_user_id, v_unlockable.id, NOW());
        
        -- Adicionar ao array de recém desbloqueados
        v_newly_unlocked := array_append(
          v_newly_unlocked,
          json_build_object(
            'id', v_unlockable.id,
            'type', v_unlockable.type,
            'name', v_unlockable.name,
            'rarity', v_unlockable.rarity
          )
        );
      END IF;
    END IF;
  END LOOP;
  
  -- Retornar lista de itens recém desbloqueados
  RETURN array_to_json(v_newly_unlocked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
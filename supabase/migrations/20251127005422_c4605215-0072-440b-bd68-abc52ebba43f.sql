-- ============================================
-- TABELA: unlockables
-- Armazena todos os itens desbloqueaveis (temas, avatares, badges)
-- ============================================
CREATE TABLE IF NOT EXISTS public.unlockables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('THEME', 'AVATAR', 'BADGE')),
  identifier TEXT NOT NULL UNIQUE, -- Ex: 'theme_cyberpunk_neon', 'avatar_ninja', 'badge_streak_master'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Critérios de desbloqueio (pelo menos um deve ser NULL, outros preenchidos)
  required_xp INTEGER,
  required_streak_days INTEGER,
  required_challenges_completed INTEGER,
  required_koins_earned INTEGER,
  
  -- Metadata específica por tipo
  preview_data JSONB, -- Ex: cores do tema, URL do avatar, ícone do badge
  
  rarity TEXT NOT NULL DEFAULT 'COMMON' CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_unlockables_type ON public.unlockables(type);
CREATE INDEX idx_unlockables_rarity ON public.unlockables(rarity);
CREATE INDEX idx_unlockables_active ON public.unlockables(is_active) WHERE is_active = true;

-- ============================================
-- TABELA: user_unlocks
-- Rastreia o que cada aluno desbloqueou
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlockable_id UUID NOT NULL REFERENCES public.unlockables(id) ON DELETE CASCADE,
  
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_equipped BOOLEAN DEFAULT false, -- Para avatares e temas: está usando atualmente?
  
  -- Metadata de quando foi desbloqueado
  unlock_context JSONB, -- Ex: {xp_at_unlock: 1500, challenges_completed: 25}
  
  UNIQUE(user_id, unlockable_id)
);

-- Índices para queries eficientes
CREATE INDEX idx_user_unlocks_user ON public.user_unlocks(user_id);
CREATE INDEX idx_user_unlocks_equipped ON public.user_unlocks(user_id, is_equipped) WHERE is_equipped = true;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Unlockables: todos podem ver itens ativos
ALTER TABLE public.unlockables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active unlockables"
  ON public.unlockables FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage unlockables"
  ON public.unlockables FOR ALL
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- User Unlocks: usuários só veem seus próprios unlocks
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unlocks"
  ON public.user_unlocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocks"
  ON public.user_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unlocks"
  ON public.user_unlocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all unlocks"
  ON public.user_unlocks FOR SELECT
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- ============================================
-- FUNÇÃO RPC: check_and_unlock_achievements
-- Verifica critérios e desbloqueia automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_xp INTEGER;
  v_user_streak INTEGER;
  v_challenges_completed INTEGER;
  v_koins_earned INTEGER;
  v_newly_unlocked JSONB := '[]'::JSONB;
  v_unlockable RECORD;
BEGIN
  -- Buscar stats atuais do usuário
  SELECT 
    COALESCE((preferences->'gamification'->>'xp')::INTEGER, 0),
    COALESCE((preferences->'gamification'->>'streak')::INTEGER, 0)
  INTO v_user_xp, v_user_streak
  FROM profiles
  WHERE id = p_user_id;
  
  -- Contar desafios completados
  SELECT COUNT(*)::INTEGER INTO v_challenges_completed
  FROM student_challenges
  WHERE student_id = p_user_id AND status = 'COMPLETED';
  
  -- Somar Koins ganhos (todas transações EARN + BONUS)
  SELECT COALESCE(SUM(amount), 0)::INTEGER INTO v_koins_earned
  FROM koin_transactions
  WHERE user_id = p_user_id AND type IN ('EARN', 'BONUS');
  
  -- Iterar sobre todos unlockables ativos e verificar critérios
  FOR v_unlockable IN
    SELECT u.*
    FROM unlockables u
    WHERE u.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM user_unlocks uu
        WHERE uu.user_id = p_user_id AND uu.unlockable_id = u.id
      )
  LOOP
    -- Verificar se usuário atende aos critérios
    IF (v_unlockable.required_xp IS NULL OR v_user_xp >= v_unlockable.required_xp) AND
       (v_unlockable.required_streak_days IS NULL OR v_user_streak >= v_unlockable.required_streak_days) AND
       (v_unlockable.required_challenges_completed IS NULL OR v_challenges_completed >= v_unlockable.required_challenges_completed) AND
       (v_unlockable.required_koins_earned IS NULL OR v_koins_earned >= v_unlockable.required_koins_earned)
    THEN
      -- Desbloquear!
      INSERT INTO user_unlocks (user_id, unlockable_id, unlock_context)
      VALUES (
        p_user_id,
        v_unlockable.id,
        jsonb_build_object(
          'xp_at_unlock', v_user_xp,
          'streak_at_unlock', v_user_streak,
          'challenges_at_unlock', v_challenges_completed,
          'koins_at_unlock', v_koins_earned
        )
      );
      
      -- Adicionar ao array de newly unlocked para retornar
      v_newly_unlocked := v_newly_unlocked || jsonb_build_object(
        'id', v_unlockable.id,
        'type', v_unlockable.type,
        'name', v_unlockable.name,
        'rarity', v_unlockable.rarity
      );
    END IF;
  END LOOP;
  
  RETURN v_newly_unlocked;
END;
$$;

-- ============================================
-- POPULAR UNLOCKABLES INICIAIS (6 Temas Premium)
-- ============================================
INSERT INTO public.unlockables (type, identifier, name, description, required_xp, required_streak_days, required_challenges_completed, preview_data, rarity) VALUES
-- Tema 1: Cyberpunk Neon
('THEME', 'theme_cyberpunk_neon', '🌃 Cyberpunk Neon', 'Tons futuristas roxo/rosa vibrante', 500, NULL, 5, 
 '{"primary": "hsl(300, 100%, 50%)", "background": "hsl(280, 30%, 8%)", "accent": "hsl(330, 100%, 60%)"}'::JSONB, 'RARE'),

-- Tema 2: Ocean Breeze
('THEME', 'theme_ocean_breeze', '🌊 Ocean Breeze', 'Azul oceano profundo com verde água', NULL, 15, NULL,
 '{"primary": "hsl(190, 80%, 50%)", "background": "hsl(200, 40%, 10%)", "accent": "hsl(180, 70%, 60%)"}'::JSONB, 'RARE'),

-- Tema 3: Sunset Gradient
('THEME', 'theme_sunset_gradient', '🌅 Sunset Gradient', 'Gradiente laranja-rosa-roxo do pôr do sol', 1000, NULL, NULL,
 '{"primary": "hsl(20, 100%, 60%)", "background": "hsl(340, 40%, 12%)", "accent": "hsl(340, 90%, 60%)"}'::JSONB, 'EPIC'),

-- Tema 4: Forest Mystic
('THEME', 'theme_forest_mystic', '🌲 Forest Mystic', 'Verde floresta místico com toques dourados', NULL, NULL, 25,
 '{"primary": "hsl(140, 60%, 45%)", "background": "hsl(150, 30%, 8%)", "accent": "hsl(45, 80%, 50%)"}'::JSONB, 'EPIC'),

-- Tema 5: Midnight Aurora
('THEME', 'theme_midnight_aurora', '🌌 Midnight Aurora', 'Aurora boreal com tons de azul e verde', NULL, 50, NULL,
 '{"primary": "hsl(170, 100%, 50%)", "background": "hsl(240, 50%, 5%)", "accent": "hsl(280, 100%, 60%)"}'::JSONB, 'LEGENDARY'),

-- Tema 6: Volcanic Fire
('THEME', 'theme_volcanic_fire', '🔥 Volcanic Fire', 'Laranja e vermelho vulcânico intenso', 2500, NULL, 50,
 '{"primary": "hsl(15, 100%, 55%)", "background": "hsl(0, 40%, 10%)", "accent": "hsl(30, 100%, 60%)"}'::JSONB, 'LEGENDARY');

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================
COMMENT ON TABLE public.unlockables IS 'Armazena temas, avatares e badges desbloqueaveis através de conquistas de gamificação';
COMMENT ON TABLE public.user_unlocks IS 'Rastreia quais unlockables cada aluno desbloqueou e quais estão atualmente equipados';
COMMENT ON FUNCTION public.check_and_unlock_achievements IS 'Verifica automaticamente se o usuário atingiu critérios para desbloquear novos itens e os desbloqueia';
-- =====================================================
-- FASE 1: ATUALIZAR BADGES EXISTENTES
-- =====================================================

-- Badges iniciais (mais fáceis)
UPDATE unlockables 
SET required_streak_days = 7, required_xp = NULL, required_challenges_completed = NULL
WHERE identifier = 'primeiro_passo' AND type = 'BADGE';

UPDATE unlockables 
SET required_streak_days = 14, required_xp = NULL, required_challenges_completed = NULL
WHERE identifier = 'fogo_no_streak' AND type = 'BADGE';

UPDATE unlockables 
SET required_xp = 250, required_streak_days = NULL, required_challenges_completed = NULL
WHERE identifier = 'estudante_ativo' AND type = 'BADGE';

-- Badges intermediários
UPDATE unlockables 
SET required_streak_days = 30, required_xp = NULL, required_challenges_completed = NULL
WHERE identifier = 'dedicacao' AND type = 'BADGE';

UPDATE unlockables 
SET required_xp = 1000, required_streak_days = NULL, required_challenges_completed = NULL
WHERE identifier = 'mestre_do_xp' AND type = 'BADGE';

UPDATE unlockables 
SET required_streak_days = 60, required_xp = 2500, required_challenges_completed = NULL
WHERE identifier = 'imparavel' AND type = 'BADGE';

-- Badge lendário (máximo desafio)
UPDATE unlockables 
SET required_streak_days = 150, required_xp = 10000, required_challenges_completed = 100
WHERE identifier = 'lendario' AND type = 'BADGE';

-- =====================================================
-- FASE 2: ADICIONAR NOVOS BADGES
-- =====================================================

INSERT INTO unlockables (type, identifier, name, description, rarity, required_challenges_completed, preview_data, is_active)
VALUES 
('BADGE', 'desafiante', '🎖️ Desafiante', 'Complete 5 desafios para provar sua determinação', 'UNCOMMON', 5, '{"emoji": "🎖️"}', true),
('BADGE', 'completador', '🏋️ Completador', 'Mestre em finalizar tarefas: 20 desafios concluídos', 'RARE', 20, '{"emoji": "🏋️"}', true),
('BADGE', 'mestre_desafios', '🔱 Mestre dos Desafios', 'Conquistador incansável: 40 desafios superados', 'EPIC', 40, '{"emoji": "🔱"}', true),
('BADGE', 'elite_academica', '💫 Elite Acadêmica', 'Excelência total: 45 dias consecutivos, 2000 XP e 30 desafios', 'EPIC', 30, '{"emoji": "💫"}', true);

-- Atualizar badge Elite Acadêmica com múltiplos requisitos
UPDATE unlockables 
SET required_streak_days = 45, required_xp = 2000
WHERE identifier = 'elite_academica' AND type = 'BADGE';

-- =====================================================
-- FASE 3: ATUALIZAR AVATARES EXISTENTES
-- =====================================================

-- AVATARES RARE (requisitos moderados)
UPDATE unlockables 
SET required_streak_days = 30, required_xp = 750, required_challenges_completed = NULL
WHERE identifier = 'dragon' AND type = 'AVATAR';

UPDATE unlockables 
SET required_streak_days = 25, required_xp = 1000, required_challenges_completed = NULL
WHERE identifier = 'shark' AND type = 'AVATAR';

UPDATE unlockables 
SET required_xp = 600, required_streak_days = NULL, required_challenges_completed = 15
WHERE identifier = 'butterfly' AND type = 'AVATAR';

-- AVATARES EPIC (requisitos elevados)
UPDATE unlockables 
SET required_streak_days = 60, required_xp = 2500, required_challenges_completed = 30
WHERE identifier = 'lightning' AND type = 'AVATAR';

UPDATE unlockables 
SET required_streak_days = 50, required_xp = 3000, required_challenges_completed = 25
WHERE identifier = 'star' AND type = 'AVATAR';

UPDATE unlockables 
SET required_streak_days = 45, required_xp = 2000, required_challenges_completed = 35
WHERE identifier = 'crystal' AND type = 'AVATAR';

-- AVATARES LEGENDARY (máximo desafio - período letivo completo)
UPDATE unlockables 
SET required_streak_days = 120, required_xp = 7500, required_challenges_completed = 75
WHERE identifier = 'trophy' AND type = 'AVATAR';

UPDATE unlockables 
SET required_streak_days = 150, required_xp = 10000, required_challenges_completed = 100
WHERE identifier = 'crown' AND type = 'AVATAR';

-- =====================================================
-- FASE 4: ADICIONAR NOVOS AVATARES UNCOMMON
-- =====================================================

INSERT INTO unlockables (type, identifier, name, description, rarity, required_streak_days, required_xp, required_challenges_completed, preview_data, is_active)
VALUES 
('AVATAR', 'raccoon', '🦝 Guaxinim Curioso', 'Desbloqueie mantendo 7 dias de streak consecutivo', 'UNCOMMON', 7, NULL, NULL, '{"emoji": "🦝", "color": "#8B7355"}', true),
('AVATAR', 'otter', '🦦 Lontra Brincalhona', 'Conquiste 150 pontos de experiência', 'UNCOMMON', NULL, 150, NULL, '{"emoji": "🦦", "color": "#6B5B4D"}', true),
('AVATAR', 'parrot', '🦜 Papagaio Colorido', 'Complete 5 desafios com sucesso', 'UNCOMMON', NULL, NULL, 5, '{"emoji": "🦜", "color": "#FF6B6B"}', true),
('AVATAR', 'turtle', '🐢 Tartaruga Sábia', 'Alcance 10 dias de streak e 100 XP', 'UNCOMMON', 10, 100, NULL, '{"emoji": "🐢", "color": "#5D8A66"}', true);

-- =====================================================
-- FASE 5: ADICIONAR NOVOS AVATARES PREMIUM
-- =====================================================

-- AVATARES RARE
INSERT INTO unlockables (type, identifier, name, description, rarity, required_streak_days, required_xp, required_challenges_completed, preview_data, is_active)
VALUES 
('AVATAR', 'eagle', '🦅 Águia Imperial', 'Majestade nos céus: 35 dias de streak e 12 desafios', 'RARE', 35, NULL, 12, '{"emoji": "🦅", "color": "#8B6914"}', true),
('AVATAR', 'wolf', '🐺 Lobo Alfa', 'Líder de matilha: 28 dias, 800 XP e 10 desafios', 'RARE', 28, 800, 10, '{"emoji": "🐺", "color": "#4A4A4A"}', true);

-- AVATARES EPIC
INSERT INTO unlockables (type, identifier, name, description, rarity, required_streak_days, required_xp, required_challenges_completed, preview_data, is_active)
VALUES 
('AVATAR', 'unicorn', '🦄 Unicórnio Místico', 'Criatura lendária: 75 dias, 3500 XP e 40 desafios', 'EPIC', 75, 3500, 40, '{"emoji": "🦄", "color": "#E0BBE4"}', true),
('AVATAR', 'fire_dragon', '🐉 Dragão de Fogo', 'Poder ardente: 55 dias, 2800 XP e 45 desafios', 'EPIC', 55, 2800, 45, '{"emoji": "🐉", "color": "#FF4500"}', true);

-- AVATARES LEGENDARY
INSERT INTO unlockables (type, identifier, name, description, rarity, required_streak_days, required_xp, required_challenges_completed, preview_data, is_active)
VALUES 
('AVATAR', 'phoenix', '🌈 Fênix Renascida', 'Renascida das cinzas: 135 dias, 8500 XP e 85 desafios', 'LEGENDARY', 135, 8500, 85, '{"emoji": "🌈", "color": "#FF6B35"}', true),
('AVATAR', 'supernova', '⭐ Supernova', 'Explosão estelar: 100 dias, 9000 XP e 90 desafios', 'LEGENDARY', 100, 9000, 90, '{"emoji": "⭐", "color": "#FFD700"}', true);
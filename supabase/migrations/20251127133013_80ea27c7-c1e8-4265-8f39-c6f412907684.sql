-- Fase 1: Corrigir as 4 duplicatas UNCOMMON
UPDATE unlockables 
SET 
  name = '🦎 Lagarto Camaleão',
  preview_data = jsonb_set(preview_data, '{emoji}', '"🦎"')
WHERE identifier = 'avatar_dragon' AND type = 'AVATAR';

UPDATE unlockables 
SET 
  name = '🐻 Urso Protetor',
  preview_data = jsonb_set(preview_data, '{emoji}', '"🐻"')
WHERE identifier = 'avatar_wolf' AND type = 'AVATAR';

UPDATE unlockables 
SET 
  name = '🦩 Flamingo Elegante',
  preview_data = jsonb_set(preview_data, '{emoji}', '"🦩"')
WHERE identifier = 'avatar_eagle' AND type = 'AVATAR';

UPDATE unlockables 
SET 
  name = '🦌 Cervo Encantado',
  preview_data = jsonb_set(preview_data, '{emoji}', '"🦌"')
WHERE identifier = 'avatar_unicorn' AND type = 'AVATAR';

-- Fase 2: Adicionar 6 novos avatares únicos

-- UNCOMMON (2 novos)
INSERT INTO unlockables (type, identifier, name, description, rarity, required_streak_days, preview_data, is_active)
VALUES 
  ('AVATAR', 'avatar_hedgehog', '🦔 Ouriço Espinhoso', 'Defesa natural e persistência', 'UNCOMMON', 12, '{"emoji": "🦔", "color": "#8B4513"}'::jsonb, true),
  ('AVATAR', 'avatar_dolphin', '🐬 Golfinho Brincalhão', 'Inteligência e alegria', 'UNCOMMON', NULL, '{"emoji": "🐬", "color": "#1E90FF"}'::jsonb, true);

-- Atualizar XP requirement para o golfinho
UPDATE unlockables 
SET required_xp = 200
WHERE identifier = 'avatar_dolphin';

-- RARE (2 novos)
INSERT INTO unlockables (type, identifier, name, description, rarity, required_streak_days, required_xp, required_challenges_completed, preview_data, is_active)
VALUES 
  ('AVATAR', 'avatar_elf', '🧝 Elfo Arcano', 'Magia ancestral e sabedoria', 'RARE', 40, NULL, 15, '{"emoji": "🧝", "color": "#9370DB"}'::jsonb, true),
  ('AVATAR', 'avatar_bison', '🦬 Bisão Selvagem', 'Força implacável da natureza', 'RARE', 32, 900, NULL, '{"emoji": "🦬", "color": "#654321"}'::jsonb, true);

-- EPIC (2 novos)
INSERT INTO unlockables (type, identifier, name, description, rarity, required_streak_days, required_xp, required_challenges_completed, preview_data, is_active)
VALUES 
  ('AVATAR', 'avatar_wizard', '🧙 Mago Ancestral', 'Conhecimento infinito e poder arcano', 'EPIC', 70, 3200, 50, '{"emoji": "🧙", "color": "#4B0082"}'::jsonb, true),
  ('AVATAR', 'avatar_triton', '🔱 Tritão dos Mares', 'Senhor das profundezas', 'EPIC', 65, 3000, 45, '{"emoji": "🔱", "color": "#006994"}'::jsonb, true);
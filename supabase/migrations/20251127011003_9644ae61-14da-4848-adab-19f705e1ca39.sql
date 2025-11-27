-- Adicionar COMMON e UNCOMMON ao enum de raridade
ALTER TABLE unlockables DROP CONSTRAINT IF EXISTS unlockables_rarity_check;
ALTER TABLE unlockables ADD CONSTRAINT unlockables_rarity_check 
  CHECK (rarity IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'));

-- Inserir 10 Avatares Comuns (Gratuitos)
INSERT INTO unlockables (type, identifier, name, description, rarity, preview_data, is_active)
VALUES 
  ('AVATAR', 'avatar_cat', '🐱 Gato Fofo', 'Um gatinho adorável', 'COMMON', '{"emoji": "🐱", "color": "#FFB6C1"}', true),
  ('AVATAR', 'avatar_dog', '🐶 Cachorro Amigável', 'Seu melhor amigo', 'COMMON', '{"emoji": "🐶", "color": "#DEB887"}', true),
  ('AVATAR', 'avatar_fox', '🦊 Raposa Esperta', 'Astuto e carismático', 'COMMON', '{"emoji": "🦊", "color": "#FF8C42"}', true),
  ('AVATAR', 'avatar_panda', '🐼 Panda Relaxado', 'Tranquilo e amigável', 'COMMON', '{"emoji": "🐼", "color": "#2D3748"}', true),
  ('AVATAR', 'avatar_koala', '🐨 Coala Sonolento', 'Sempre pronto para uma soneca', 'COMMON', '{"emoji": "🐨", "color": "#A0AEC0"}', true),
  ('AVATAR', 'avatar_lion', '🦁 Leão Corajoso', 'Rei da selva', 'COMMON', '{"emoji": "🦁", "color": "#D69E2E"}', true),
  ('AVATAR', 'avatar_frog', '🐸 Sapo Saltitante', 'Sempre animado', 'COMMON', '{"emoji": "🐸", "color": "#48BB78"}', true),
  ('AVATAR', 'avatar_owl', '🦉 Coruja Sábia', 'Símbolo de sabedoria', 'COMMON', '{"emoji": "🦉", "color": "#805AD5"}', true),
  ('AVATAR', 'avatar_penguin', '🐧 Pinguim Estiloso', 'Sempre bem vestido', 'COMMON', '{"emoji": "🐧", "color": "#2C5282"}', true),
  ('AVATAR', 'avatar_rabbit', '🐰 Coelho Veloz', 'Rápido e ágil', 'COMMON', '{"emoji": "🐰", "color": "#E9D8A6"}', true);

-- Inserir 5 Avatares Incomuns (100 XP ou 3 dias streak)
INSERT INTO unlockables (type, identifier, name, description, rarity, required_xp, required_streak_days, preview_data, is_active)
VALUES 
  ('AVATAR', 'avatar_dragon', '🐉 Dragão Místico', 'Poder e sabedoria antiga', 'UNCOMMON', 100, 3, '{"emoji": "🐉", "color": "#F56565"}', true),
  ('AVATAR', 'avatar_unicorn', '🦄 Unicórnio Mágico', 'Pureza e magia', 'UNCOMMON', 100, 3, '{"emoji": "🦄", "color": "#ED64A6"}', true),
  ('AVATAR', 'avatar_wolf', '🐺 Lobo Selvagem', 'Espírito livre', 'UNCOMMON', 100, 3, '{"emoji": "🐺", "color": "#718096"}', true),
  ('AVATAR', 'avatar_eagle', '🦅 Águia Imperial', 'Visão aguçada', 'UNCOMMON', 100, 3, '{"emoji": "🦅", "color": "#744210"}', true),
  ('AVATAR', 'avatar_octopus', '🐙 Polvo Inteligente', 'Criatividade sem limites', 'UNCOMMON', 100, 3, '{"emoji": "🐙", "color": "#9F7AEA"}', true);

-- Inserir 4 Avatares Raros (500 XP ou 15 dias streak)
INSERT INTO unlockables (type, identifier, name, description, rarity, required_xp, required_streak_days, preview_data, is_active)
VALUES 
  ('AVATAR', 'avatar_butterfly', '🦋 Borboleta Elegante', 'Transformação e beleza', 'RARE', 500, 15, '{"emoji": "🦋", "color": "#3182CE"}', true),
  ('AVATAR', 'avatar_chinese_dragon', '🐲 Dragão Celestial', 'Guardião do conhecimento', 'RARE', 500, 15, '{"emoji": "🐲", "color": "#DD6B20"}', true),
  ('AVATAR', 'avatar_shark', '🦈 Tubarão Destemido', 'Força e determinação', 'RARE', 500, 15, '{"emoji": "🦈", "color": "#2C5282"}', true),
  ('AVATAR', 'avatar_peacock', '🦚 Pavão Majestoso', 'Orgulho e elegância', 'RARE', 500, 15, '{"emoji": "🦚", "color": "#38B2AC"}', true);

-- Inserir 3 Avatares Épicos (1000 XP ou 30 dias streak ou 10 desafios)
INSERT INTO unlockables (type, identifier, name, description, rarity, required_xp, required_streak_days, required_challenges_completed, preview_data, is_active)
VALUES 
  ('AVATAR', 'avatar_star', '🌟 Estrela Brilhante', 'Destaque e excelência', 'EPIC', 1000, 30, 10, '{"emoji": "🌟", "color": "#F6E05E"}', true),
  ('AVATAR', 'avatar_crystal_ball', '🔮 Bola de Cristal', 'Visão do futuro', 'EPIC', 1000, 30, 10, '{"emoji": "🔮", "color": "#805AD5"}', true),
  ('AVATAR', 'avatar_lightning', '⚡ Raio Poderoso', 'Energia ilimitada', 'EPIC', 1000, 30, 10, '{"emoji": "⚡", "color": "#ECC94B"}', true);

-- Inserir 2 Avatares Lendários (2500 XP ou 50 dias streak ou 25 desafios)
INSERT INTO unlockables (type, identifier, name, description, rarity, required_xp, required_streak_days, required_challenges_completed, preview_data, is_active)
VALUES 
  ('AVATAR', 'avatar_crown', '👑 Coroa Imperial', 'Realeza acadêmica', 'LEGENDARY', 2500, 50, 25, '{"emoji": "👑", "color": "#D69E2E"}', true),
  ('AVATAR', 'avatar_trophy', '🏆 Troféu de Ouro', 'Campeão dos estudos', 'LEGENDARY', 2500, 50, 25, '{"emoji": "🏆", "color": "#F6AD55"}', true);
-- FASE 1: Atualizar requisitos nos avatares COMMON para gamificação progressiva
-- 3 avatares permanecem sem requisitos (gratuitos): Cachorro, Gato, Coelho
-- 7 avatares ganham requisitos baixos de XP ou Streak

-- Avatares com requisito de XP
UPDATE unlockables
SET required_xp = 10
WHERE type = 'AVATAR' 
  AND rarity = 'COMMON' 
  AND name = 'Sapo Saltitante';

UPDATE unlockables
SET required_xp = 20
WHERE type = 'AVATAR' 
  AND rarity = 'COMMON' 
  AND name = 'Pinguim Estiloso';

UPDATE unlockables
SET required_xp = 30
WHERE type = 'AVATAR' 
  AND rarity = 'COMMON' 
  AND name = 'Coala Sonolento';

UPDATE unlockables
SET required_xp = 50
WHERE type = 'AVATAR' 
  AND rarity = 'COMMON' 
  AND name = 'Raposa Esperta';

-- Avatares com requisito de Streak
UPDATE unlockables
SET required_streak_days = 1
WHERE type = 'AVATAR' 
  AND rarity = 'COMMON' 
  AND name = 'Panda Relaxado';

UPDATE unlockables
SET required_streak_days = 2
WHERE type = 'AVATAR' 
  AND rarity = 'COMMON' 
  AND name = 'Coruja Sábia';

UPDATE unlockables
SET required_streak_days = 3
WHERE type = 'AVATAR' 
  AND rarity = 'COMMON' 
  AND name = 'Leão Corajoso';
-- Corrigir requisitos dos avatares LEGENDARY para progressão adequada

-- Troféu de Ouro: Primeiro LEGENDARY (7500 XP / 85 dias / 75 desafios)
UPDATE unlockables SET
  required_xp = 7500,
  required_streak_days = 85,
  required_challenges_completed = 75
WHERE identifier = 'avatar_trophy' AND type = 'AVATAR';

-- Coroa Imperial: O TOPO ABSOLUTO (10000 XP / 150 dias / 100 desafios)
UPDATE unlockables SET
  required_xp = 10000,
  required_streak_days = 150,
  required_challenges_completed = 100
WHERE identifier = 'avatar_crown' AND type = 'AVATAR';

-- Supernova: Terceiro tier (9500 XP / 140 dias / 95 desafios)
UPDATE unlockables SET
  required_xp = 9500,
  required_streak_days = 140,
  required_challenges_completed = 95
WHERE identifier = 'supernova' AND type = 'AVATAR';
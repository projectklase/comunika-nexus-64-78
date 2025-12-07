-- Inserir tema Sakura Dreams na tabela unlockables
INSERT INTO unlockables (
  name,
  description,
  type,
  identifier,
  rarity,
  required_xp,
  required_streak_days,
  required_challenges_completed,
  required_koins_earned,
  preview_data,
  is_active
) VALUES (
  '🌸 Sakura Dreams',
  'Noite de primavera com flores de cerejeira e lua cheia - tema com imagem de fundo',
  'THEME',
  'theme_sakura_dreams',
  'LEGENDARY',
  2000,
  30,
  NULL,
  NULL,
  '{"background": "hsl(280, 45%, 10%)", "primary": "hsl(330, 80%, 70%)", "accent": "hsl(290, 70%, 60%)", "hasBackgroundImage": true}',
  true
);

-- Desbloquear automaticamente para todos os administradores testarem
INSERT INTO user_unlocks (user_id, unlockable_id, unlocked_at, is_equipped)
SELECT 
  sm.user_id,
  u.id,
  NOW(),
  false
FROM school_memberships sm
CROSS JOIN unlockables u
WHERE sm.role = 'administrador'
  AND u.identifier = 'theme_sakura_dreams'
ON CONFLICT DO NOTHING;
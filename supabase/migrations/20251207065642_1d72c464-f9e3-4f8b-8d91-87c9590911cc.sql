-- Substituir Cyberpunk Neon por Cyberpunk City como tema LEGENDARY
UPDATE unlockables 
SET 
  identifier = 'theme_cyberpunk_city',
  name = '🏙️ Cyberpunk City',
  description = 'Cidade neon futurista com visual cyberpunk - tema com imagem de fundo',
  rarity = 'LEGENDARY',
  required_xp = 2500,
  required_streak_days = 30,
  required_challenges_completed = NULL,
  required_koins_earned = NULL,
  preview_data = '{"background":"hsl(250,50%,6%)","primary":"hsl(330,100%,60%)","accent":"hsl(185,100%,50%)","hasBackgroundImage":true}',
  updated_at = NOW()
WHERE id = '4614454c-aa35-46bb-8fb8-fce0ef39d60a';
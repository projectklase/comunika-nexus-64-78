-- Corrigir caminho da imagem da Fênix para usar public folder
UPDATE unlockables 
SET preview_data = jsonb_set(
  preview_data, 
  '{imageUrl}', 
  '"/avatars/phoenix.png"'
)
WHERE identifier = 'avatar_phoenix' AND type = 'AVATAR';
-- Adicionar imageUrl ao preview_data da Fênix
UPDATE unlockables 
SET preview_data = jsonb_set(
  preview_data, 
  '{imageUrl}', 
  '"/src/assets/avatars/phoenix.png"'
)
WHERE identifier = 'avatar_phoenix' AND type = 'AVATAR';
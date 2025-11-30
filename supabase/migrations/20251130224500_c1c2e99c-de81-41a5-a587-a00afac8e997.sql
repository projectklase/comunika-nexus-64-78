-- Inserir todas as cartas para Aline Menezes (d28d4f1c-fc41-4c56-8445-c501d0585d58)
INSERT INTO user_cards (user_id, card_id, quantity, unlock_source)
SELECT 
  'd28d4f1c-fc41-4c56-8445-c501d0585d58'::uuid,
  id,
  3,
  'REWARD'
FROM cards 
WHERE is_active = true
ON CONFLICT (user_id, card_id) 
DO UPDATE SET quantity = 3;

-- Inserir todas as cartas para Karen Gimenez (2ca72d74-f0ac-407e-a524-c08e54e94efb)
INSERT INTO user_cards (user_id, card_id, quantity, unlock_source)
SELECT 
  '2ca72d74-f0ac-407e-a524-c08e54e94efb'::uuid,
  id,
  3,
  'REWARD'
FROM cards 
WHERE is_active = true
ON CONFLICT (user_id, card_id) 
DO UPDATE SET quantity = 3;
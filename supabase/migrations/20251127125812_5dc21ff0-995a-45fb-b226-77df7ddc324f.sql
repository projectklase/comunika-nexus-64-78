-- Corrigir emoji da Fênix Renascida: trocar arco-íris por ave de fogo épica
UPDATE unlockables 
SET 
  name = '🐦‍🔥 Fênix Renascida',
  preview_data = jsonb_set(preview_data, '{emoji}', '"🐦‍🔥"')
WHERE identifier = 'phoenix';
-- Fix Escudo Mágico card to block all damage (SHIELD 9999)
UPDATE cards 
SET effects = '[{"type": "SHIELD", "value": 9999}]'::jsonb 
WHERE name = 'Escudo Mágico';
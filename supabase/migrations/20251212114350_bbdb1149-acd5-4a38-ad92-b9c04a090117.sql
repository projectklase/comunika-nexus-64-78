-- Atualizar descrições das cartas com DOUBLE para refletir comportamento real

-- César Imortal
UPDATE cards 
SET effects = '[{"type":"BOOST","value":1.6,"description":"+60% ATK"},{"type":"DOUBLE","value":2,"description":"Aplica BOOST 2x"}]'
WHERE name = 'César Imortal';

-- Darwin Evolucionário
UPDATE cards 
SET effects = '[{"type":"BOOST","value":1.6,"description":"+60% ATK"},{"type":"DOUBLE","value":2,"description":"Aplica BOOST 2x"}]'
WHERE name = 'Darwin Evolucionário';

-- Leonardo da Vinci Supremo
UPDATE cards 
SET effects = '[{"type":"BOOST","value":1.6,"description":"+60% ATK"},{"type":"DOUBLE","value":2,"description":"Aplica BOOST 2x"}]'
WHERE name = 'Leonardo da Vinci Supremo';

-- Alexandre o Grande
UPDATE cards 
SET effects = '[{"type":"BOOST","value":1.7,"description":"+70% ATK"},{"type":"DOUBLE","value":2,"description":"Aplica BOOST 2x"}]'
WHERE name = 'Alexandre o Grande';

-- Usain Bolt Relâmpago
UPDATE cards 
SET effects = '[{"type":"BOOST","value":1.5,"description":"+50% ATK"},{"type":"DOUBLE","value":2,"description":"Aplica BOOST 2x"}]'
WHERE name = 'Usain Bolt Relâmpago';

-- Maratonista Imortal - trocar DOUBLE por BOOST (DOUBLE sem BOOST é inútil)
UPDATE cards 
SET effects = '[{"type":"BOOST","value":1.3,"description":"+30% ATK"},{"type":"HEAL","value":8,"description":"Cura 8 HP"}]'
WHERE name = 'Maratonista Imortal';
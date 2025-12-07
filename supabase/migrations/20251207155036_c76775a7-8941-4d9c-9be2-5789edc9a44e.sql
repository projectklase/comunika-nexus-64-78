-- =============================================
-- REBALANCE: Leonardo da Vinci Supremo (faltou na migração anterior)
-- =============================================
UPDATE cards 
SET 
  atk = 37,
  effects = jsonb_set(
    jsonb_set(effects, '{0,value}', '1.6'),
    '{1,value}', '1.5'
  )
WHERE name = 'Leonardo da Vinci Supremo';

-- =============================================
-- ATUALIZAR DESCRIÇÕES DOS EFEITOS - LEGENDARY
-- =============================================

-- Alexandre o Grande: BOOST 1.7 → "+70% ATK", DOUBLE 1.3 → "+30% dano extra"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.7, "description": "+70% ATK"}, {"type": "DOUBLE", "value": 1.3, "description": "+30% dano extra"}]'::jsonb
WHERE name = 'Alexandre o Grande';

-- César Imortal: BOOST 1.6 → "+60% ATK", DOUBLE 1.5 → "+50% dano extra"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.6, "description": "+60% ATK"}, {"type": "DOUBLE", "value": 1.5, "description": "+50% dano extra"}]'::jsonb
WHERE name = 'César Imortal';

-- Darwin Evolucionário: BOOST 1.6 → "+60% ATK", DOUBLE 1.5 → "+50% dano extra"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.6, "description": "+60% ATK"}, {"type": "DOUBLE", "value": 1.5, "description": "+50% dano extra"}]'::jsonb
WHERE name = 'Darwin Evolucionário';

-- Einstein da Matemática: BOOST 1.6 → "+60% ATK"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.6, "description": "+60% ATK"}, {"type": "SHIELD", "value": 10, "description": "Bloqueia 10 de dano"}]'::jsonb
WHERE name = 'Einstein da Matemática';

-- Gauss Dimensional: BOOST 1.7 → "+70% ATK"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.7, "description": "+70% ATK"}, {"type": "BURN", "value": 5, "description": "Causa 5 de dano por turno"}]'::jsonb
WHERE name = 'Gauss Dimensional';

-- Hércules Olímpico: BOOST 1.8 → "+80% ATK"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.8, "description": "+80% ATK"}, {"type": "SHIELD", "value": 15, "description": "Bloqueia 15 de dano"}]'::jsonb
WHERE name = 'Hércules Olímpico';

-- Leonardo da Vinci Supremo: BOOST 1.6 → "+60% ATK", DOUBLE 1.5 → "+50% dano extra"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.6, "description": "+60% ATK"}, {"type": "DOUBLE", "value": 1.5, "description": "+50% dano extra"}]'::jsonb
WHERE name = 'Leonardo da Vinci Supremo';

-- Maratonista Imortal: DOUBLE 1.3 → "+30% dano extra"
UPDATE cards 
SET effects = '[{"type": "DOUBLE", "value": 1.3, "description": "+30% dano extra"}, {"type": "HEAL", "value": 8, "description": "Cura 8 HP"}]'::jsonb
WHERE name = 'Maratonista Imortal';

-- Mozart Imortal: BOOST 1.6 → "+60% ATK"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.6, "description": "+60% ATK"}, {"type": "HEAL", "value": 10, "description": "Cura 10 HP"}]'::jsonb
WHERE name = 'Mozart Imortal';

-- Newton Galáctico: BOOST 1.8 → "+80% ATK"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.8, "description": "+80% ATK"}, {"type": "BURN", "value": 7, "description": "Causa 7 de dano por turno"}]'::jsonb
WHERE name = 'Newton Galáctico';

-- =============================================
-- ATUALIZAR DESCRIÇÕES DOS EFEITOS - EPIC
-- =============================================

-- Michael Jordan Celestial: BOOST 1.5 → "+50% ATK"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.5, "description": "+50% ATK"}, {"type": "SHIELD", "value": 8, "description": "Bloqueia 8 de dano"}]'::jsonb
WHERE name = 'Michael Jordan Celestial';

-- Samurai Lendário: BOOST 1.5 → "+50% ATK"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.5, "description": "+50% ATK"}, {"type": "BURN", "value": 4, "description": "Causa 4 de dano por turno"}]'::jsonb
WHERE name = 'Samurai Lendário';

-- Usain Bolt Relâmpago: BOOST 1.5 → "+50% ATK", DOUBLE 1.3 → "+30% dano extra"
UPDATE cards 
SET effects = '[{"type": "BOOST", "value": 1.5, "description": "+50% ATK"}, {"type": "DOUBLE", "value": 1.3, "description": "+30% dano extra"}]'::jsonb
WHERE name = 'Usain Bolt Relâmpago';
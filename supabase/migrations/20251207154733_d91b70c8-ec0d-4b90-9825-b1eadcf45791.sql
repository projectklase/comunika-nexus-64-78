
-- Rebalancear cartas LEGENDARY - reduzir ATK e BOOST/DOUBLE
-- Objetivo: limitar dano máximo a ~70 DMG para evitar one-shot kills

-- Hércules Olímpico: ATK 48→38, BOOST 2.5→1.8
UPDATE public.cards 
SET atk = 38, 
    effects = jsonb_set(
      effects,
      '{0,value}',
      '1.8'
    )
WHERE name = 'Hércules Olímpico' AND rarity = 'LEGENDARY';

-- César Imortal: ATK 48→40, ajustar BOOST para 1.6 e DOUBLE para 1.5
UPDATE public.cards 
SET atk = 40,
    effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'BOOST' THEN jsonb_set(effect, '{value}', '1.6')
          WHEN effect->>'type' = 'DOUBLE' THEN jsonb_set(effect, '{value}', '1.5')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'César Imortal' AND rarity = 'LEGENDARY';

-- Alexandre o Grande: ATK 47→38, BOOST 2.5→1.7, DOUBLE 2→1.3
UPDATE public.cards 
SET atk = 38,
    effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'BOOST' THEN jsonb_set(effect, '{value}', '1.7')
          WHEN effect->>'type' = 'DOUBLE' THEN jsonb_set(effect, '{value}', '1.3')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Alexandre o Grande' AND rarity = 'LEGENDARY';

-- Leonardo da Vinci: ATK 46→37, BOOST 2.0→1.6, DOUBLE 3→1.5
UPDATE public.cards 
SET atk = 37,
    effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'BOOST' THEN jsonb_set(effect, '{value}', '1.6')
          WHEN effect->>'type' = 'DOUBLE' THEN jsonb_set(effect, '{value}', '1.5')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Leonardo da Vinci' AND rarity = 'LEGENDARY';

-- Einstein da Matemática: ATK 45→36, BOOST 2.0→1.6
UPDATE public.cards 
SET atk = 36,
    effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'BOOST' THEN jsonb_set(effect, '{value}', '1.6')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Einstein da Matemática' AND rarity = 'LEGENDARY';

-- Newton Galáctico: ATK 42→36, BOOST 2.5→1.8
UPDATE public.cards 
SET atk = 36,
    effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'BOOST' THEN jsonb_set(effect, '{value}', '1.8')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Newton Galáctico' AND rarity = 'LEGENDARY';

-- Gauss Dimensional: ATK 44→37, BOOST 2.2→1.7
UPDATE public.cards 
SET atk = 37,
    effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'BOOST' THEN jsonb_set(effect, '{value}', '1.7')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Gauss Dimensional' AND rarity = 'LEGENDARY';

-- Mozart Imortal: ATK 44→36, BOOST 1.8→1.6
UPDATE public.cards 
SET atk = 36,
    effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'BOOST' THEN jsonb_set(effect, '{value}', '1.6')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Mozart Imortal' AND rarity = 'LEGENDARY';

-- Darwin Evolucionário: ATK 43→35, BOOST 1.8→1.6, DOUBLE 3→1.5
UPDATE public.cards 
SET atk = 35,
    effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'BOOST' THEN jsonb_set(effect, '{value}', '1.6')
          WHEN effect->>'type' = 'DOUBLE' THEN jsonb_set(effect, '{value}', '1.5')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Darwin Evolucionário' AND rarity = 'LEGENDARY';

-- Maratonista Imortal: ATK 42→35, DOUBLE 2→1.3
UPDATE public.cards 
SET atk = 35,
    effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'DOUBLE' THEN jsonb_set(effect, '{value}', '1.3')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Maratonista Imortal' AND rarity = 'LEGENDARY';

-- Rebalancear cartas EPIC com valores extremos

-- Michael Jordan Celestial: BOOST 2.0→1.5
UPDATE public.cards 
SET effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'BOOST' THEN jsonb_set(effect, '{value}', '1.5')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Michael Jordan Celestial' AND rarity = 'EPIC';

-- Samurai Lendário: BOOST 1.8→1.5
UPDATE public.cards 
SET effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'BOOST' THEN jsonb_set(effect, '{value}', '1.5')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Samurai Lendário' AND rarity = 'EPIC';

-- Usain Bolt Relâmpago: DOUBLE 2→1.3
UPDATE public.cards 
SET effects = (
      SELECT jsonb_agg(
        CASE 
          WHEN effect->>'type' = 'DOUBLE' THEN jsonb_set(effect, '{value}', '1.3')
          ELSE effect
        END
      )
      FROM jsonb_array_elements(effects) AS effect
    )
WHERE name = 'Usain Bolt Relâmpago' AND rarity = 'EPIC';

-- Atualizar image_url das 8 cartas ESPORTES COMMON

-- Arco e Flecha (COMMON ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/arco-e-flecha.png', updated_at = now()
WHERE id = 'd75c8535-7b0c-4c07-9a78-eb3acf09cda8';

-- Bicicleta Turbo (COMMON ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/bicicleta-turbo.png', updated_at = now()
WHERE id = '65080671-0140-47c3-a829-fe6261279b0e';

-- Bola de Futebol (COMMON ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/bola-de-futebol.png', updated_at = now()
WHERE id = '6e4a44db-f00a-4904-acbf-540121bbac54';

-- Haltere de Bronze (COMMON ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/haltere-de-bronze.png', updated_at = now()
WHERE id = '969095a1-d5cf-40b6-a6f0-0e02d0acfe1c';

-- Luva de Boxe (COMMON ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/luva-de-boxe.png', updated_at = now()
WHERE id = '0e773fec-4cb2-4a9c-9e75-fe5fc3e7b6ce';

-- Raquete Veloz (COMMON ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/raquete-veloz.png', updated_at = now()
WHERE id = '1fc29647-4280-4cc0-8481-3b7aff79508f';

-- Skate Radical (COMMON ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/skate-radical.png', updated_at = now()
WHERE id = 'cb1c5c08-638c-4791-8c06-609aa1d4cc8f';

-- Tênis Saltador (COMMON ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/tenis-saltador.png', updated_at = now()
WHERE id = '0a4c123f-8f0f-442f-a0f1-3cfecd6a7725';
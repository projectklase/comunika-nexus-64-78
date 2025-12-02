-- Atualizar image_url das 6 cartas ESPORTES RARE

-- Arqueiro Zen (RARE ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/arqueiro-zen.png', updated_at = now()
WHERE id = '18a56d40-e278-4598-b7ef-fa36727d7c95';

-- Ginasta Acrobata (RARE ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/ginasta-acrobata.png', updated_at = now()
WHERE id = '8b1c5dd4-0955-4138-94b4-ae0a8283f830';

-- Goleiro Fantasma (RARE ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/goleiro-fantasma.png', updated_at = now()
WHERE id = '185477ee-e9fc-44fc-8cd4-4e8e27476f39';

-- Lutador de Sumô (RARE ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/lutador-de-sumo.png', updated_at = now()
WHERE id = '538255dc-c537-4f44-98b7-2268f5bdf74e';

-- Nadador Olímpico (RARE ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/nadador-olimpico.png', updated_at = now()
WHERE id = '128be70d-e141-4523-9140-0a44d58e872e';

-- Skatista Lendário (RARE ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/skatista-lendario.png', updated_at = now()
WHERE id = 'cfeba6a7-fe80-45e1-93a6-bf075a3c87ce';
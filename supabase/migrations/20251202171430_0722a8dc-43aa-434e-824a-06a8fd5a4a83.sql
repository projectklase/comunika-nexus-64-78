-- Atualizar image_url das 4 cartas com as imagens importadas

-- Contra-Ataque (TRAP RARE)
UPDATE public.cards 
SET image_url = '/cards/contra-ataque.png', updated_at = now()
WHERE id = '775dd543-5226-483e-af43-9a76324e3a84';

-- Emboscada (TRAP RARE)
UPDATE public.cards 
SET image_url = '/cards/emboscada.png', updated_at = now()
WHERE id = '7044b01f-89e0-4619-9098-590bcb342b40';

-- Escudo Mágico (TRAP RARE)
UPDATE public.cards 
SET image_url = '/cards/escudo-magico.png', updated_at = now()
WHERE id = 'fbe6c7a0-ec45-4666-a60f-00caefef7cfb';

-- Roubo de Energia (SPELL RARE)
UPDATE public.cards 
SET image_url = '/cards/roubo-de-energia.png', updated_at = now()
WHERE id = 'c211084d-aec5-4374-96e8-a4744a35ce0a';
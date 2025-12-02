-- Atualizar image_url das 6 cartas ESPORTES (4 EPIC + 2 LEGENDARY)

-- Michael Jordan Celestial (EPIC ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/michael-jordan-celestial.png', updated_at = now()
WHERE id = '315c0601-2fee-45ec-aab5-e8a51b36213a';

-- Muhammad Ali Invicto (EPIC ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/muhammad-ali-invicto.png', updated_at = now()
WHERE id = 'bedc650d-3d6c-46b7-bf19-3533a5e9eb32';

-- Pelé do Trovão (EPIC ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/pele-do-trovao.png', updated_at = now()
WHERE id = '3e7d42ad-755c-49f5-9f7f-55f91796d049';

-- Usain Bolt Relâmpago (EPIC ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/usain-bolt-relampago.png', updated_at = now()
WHERE id = '9245cf19-b640-4276-9f04-f78b4932bb08';

-- Hércules Olímpico (LEGENDARY ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/hercules-olimpico.png', updated_at = now()
WHERE id = '730113c2-fa26-4f9e-b6fd-731f2f4fc942';

-- Maratonista Imortal (LEGENDARY ESPORTES)
UPDATE public.cards 
SET image_url = '/cards/maratonista-imortal.png', updated_at = now()
WHERE id = '01083804-544b-4a39-9562-ac70dbfe251f';
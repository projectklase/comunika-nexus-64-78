-- Atualizar Van Gogh Girassol com nova arte
UPDATE public.cards 
SET image_url = '/card-images/van-gogh-girassol.png',
    updated_at = now()
WHERE id = '7c34e088-de3f-4cc7-ac47-594b973802bb';

-- Atualizar Veneno Lento com nova arte
UPDATE public.cards 
SET image_url = '/card-images/veneno-lento.png',
    updated_at = now()
WHERE id = '49b64b5e-0473-4e85-93da-2951142fac6d';
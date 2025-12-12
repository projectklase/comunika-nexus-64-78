-- Atualizar Beethoven Trovão com nova arte
UPDATE public.cards 
SET image_url = '/card-images/beethoven-trovao.png',
    updated_at = now()
WHERE id = 'df1b6cf5-7caf-4038-b0bd-cda102514791';
-- Create storage bucket for card images
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Public read card images" ON storage.objects;
DROP POLICY IF EXISTS "Service role upload card images" ON storage.objects;
DROP POLICY IF EXISTS "Service role update card images" ON storage.objects;
DROP POLICY IF EXISTS "Service role delete card images" ON storage.objects;

-- Allow public read access to card images
CREATE POLICY "Public read card images"
ON storage.objects FOR SELECT
USING (bucket_id = 'card-images');

-- Allow service role to upload card images (for edge function)
CREATE POLICY "Service role upload card images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'card-images' 
  AND auth.role() = 'service_role'
);

-- Allow service role to update card images
CREATE POLICY "Service role update card images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'card-images' 
  AND auth.role() = 'service_role'
);

-- Allow service role to delete card images
CREATE POLICY "Service role delete card images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'card-images' 
  AND auth.role() = 'service_role'
);
-- Create storage bucket for onboarding PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding-pdfs', 
  'onboarding-pdfs', 
  true, 
  5242880, -- 5MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (superadmins) to upload PDFs
CREATE POLICY "Superadmins can upload onboarding PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'onboarding-pdfs' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Allow public read access to onboarding PDFs
CREATE POLICY "Public can read onboarding PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'onboarding-pdfs');
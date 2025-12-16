-- Create private storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create table for support ticket attachments
CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Users can create attachments for their own tickets
CREATE POLICY "Users can create attachments for own tickets"
ON public.support_ticket_attachments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE id = ticket_id AND admin_id = auth.uid()
  )
);

-- Users can view attachments of own tickets OR superadmin can view all
CREATE POLICY "Users can view own ticket attachments"
ON public.support_ticket_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE id = ticket_id AND admin_id = auth.uid()
  )
  OR is_superadmin(auth.uid())
);

-- Storage policies for support-attachments bucket
CREATE POLICY "Authenticated users can upload support files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'support-attachments');

CREATE POLICY "Users can download own ticket files or superadmin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_superadmin(auth.uid())
  )
);
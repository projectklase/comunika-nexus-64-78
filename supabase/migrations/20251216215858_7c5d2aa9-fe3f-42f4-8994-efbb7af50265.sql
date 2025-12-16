-- Remover policy existente de download
DROP POLICY IF EXISTS "Users can download own ticket files or superadmin" ON storage.objects;

-- Criar nova policy mais robusta para download
CREATE POLICY "Users can download support files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (
    -- Superadmin pode baixar qualquer arquivo
    is_superadmin(auth.uid())
    OR
    -- Usuário pode baixar arquivos dos seus próprios tickets
    (storage.foldername(name))[1] IN (
      SELECT st.admin_id::text 
      FROM support_tickets st 
      WHERE st.admin_id = auth.uid()
    )
  )
);
-- Permitir que alunos deletem seus próprios convites de eventos
CREATE POLICY "Alunos podem deletar seus próprios convites"
ON event_invitations
FOR DELETE
TO authenticated
USING (inviting_student_id = auth.uid());
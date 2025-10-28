-- Criar tabela de registro de presença em eventos
CREATE TABLE public.event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_invitation_id UUID NULL REFERENCES event_invitations(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMP WITH TIME ZONE NULL,
  checked_by UUID NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraint única: previne duplicatas
  CONSTRAINT attendance_unique_student_event UNIQUE(event_id, student_id, guest_invitation_id)
);

-- Comentários para documentação
COMMENT ON TABLE public.event_attendance IS 'Registro de presença de alunos e convidados em eventos';
COMMENT ON COLUMN public.event_attendance.student_id IS 'Aluno confirmado no evento';
COMMENT ON COLUMN public.event_attendance.guest_invitation_id IS 'NULL para aluno, preenchido para convidado';
COMMENT ON COLUMN public.event_attendance.attended IS 'Indica se esteve presente no evento';

-- Índices para performance
CREATE INDEX idx_attendance_event ON public.event_attendance(event_id);
CREATE INDEX idx_attendance_student ON public.event_attendance(student_id);
CREATE INDEX idx_attendance_guest ON public.event_attendance(guest_invitation_id) WHERE guest_invitation_id IS NOT NULL;

-- Habilitar RLS
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- Política: Secretaria pode gerenciar tudo
CREATE POLICY "Secretaria pode gerenciar attendance"
  ON public.event_attendance
  FOR ALL
  USING (has_role(auth.uid(), 'secretaria'::app_role));

-- Política: Alunos podem ver suas próprias presenças
CREATE POLICY "Alunos podem ver suas presenças"
  ON public.event_attendance
  FOR SELECT
  USING (student_id = auth.uid());

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.event_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
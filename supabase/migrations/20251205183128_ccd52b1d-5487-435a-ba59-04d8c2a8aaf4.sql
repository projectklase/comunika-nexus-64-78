-- Tabela para registrar presença em aulas
CREATE TABLE public.class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PRESENTE', 'FALTA', 'JUSTIFICADA')),
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Garantir um registro por aluno/turma/data
  UNIQUE (class_id, student_id, date)
);

-- Índices para performance
CREATE INDEX idx_class_attendance_class_date ON class_attendance(class_id, date);
CREATE INDEX idx_class_attendance_student ON class_attendance(student_id);
CREATE INDEX idx_class_attendance_school ON class_attendance(school_id);

-- Habilitar RLS
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;

-- Professores podem gerenciar chamada das suas turmas
CREATE POLICY "Teachers can manage own class attendance" ON class_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_attendance.class_id
      AND c.main_teacher_id = auth.uid()
    )
  );

-- Admins/Secretárias podem gerenciar da escola
CREATE POLICY "Staff can manage school attendance" ON class_attendance
  FOR ALL USING (
    user_has_school_access(auth.uid(), school_id) AND
    (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role))
  );

-- Alunos podem ver própria presença
CREATE POLICY "Students can view own attendance" ON class_attendance
  FOR SELECT USING (student_id = auth.uid());

-- Trigger para preencher school_id automaticamente a partir da turma
CREATE OR REPLACE FUNCTION set_attendance_school_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT school_id INTO NEW.school_id
  FROM classes WHERE id = NEW.class_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';

CREATE TRIGGER attendance_set_school_id
  BEFORE INSERT ON class_attendance
  FOR EACH ROW EXECUTE FUNCTION set_attendance_school_id();
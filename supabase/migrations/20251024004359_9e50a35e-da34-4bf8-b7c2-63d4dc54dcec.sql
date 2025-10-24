-- Permitir que alunos vejam suas próprias matrículas
CREATE POLICY "Alunos podem ver suas próprias matrículas"
ON public.class_students
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Permitir que professores vejam alunos de suas turmas
CREATE POLICY "Professores podem ver alunos de suas turmas"
ON public.class_students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    WHERE classes.id = class_students.class_id
    AND classes.main_teacher_id = auth.uid()
  )
);
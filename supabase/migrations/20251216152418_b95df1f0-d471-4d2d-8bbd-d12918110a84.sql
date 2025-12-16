-- Add is_student_access_active column for Soft Launch feature
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS is_student_access_active BOOLEAN DEFAULT false;

COMMENT ON COLUMN schools.is_student_access_active IS 'Controla se alunos podem acessar o sistema. False = Sala de Espera (Soft Launch)';
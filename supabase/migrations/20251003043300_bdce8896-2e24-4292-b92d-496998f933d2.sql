-- Criar tabela de responsáveis (guardians)
CREATE TABLE IF NOT EXISTS public.guardians (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  relation text NOT NULL CHECK (relation IN ('PAI', 'MAE', 'RESPONSAVEL', 'OUTRO')),
  phone text,
  email text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Adicionar colunas student-specific ao profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dob date,
ADD COLUMN IF NOT EXISTS enrollment_number text,
ADD COLUMN IF NOT EXISTS student_notes text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_guardians_student_id ON public.guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- RLS para guardians
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para guardians
CREATE POLICY "Usuários podem ver responsáveis de seus alunos"
ON public.guardians
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role = 'secretaria'
  )
  OR auth.uid() = student_id
  OR auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role = 'professor'
  )
);

CREATE POLICY "Secretaria pode gerenciar responsáveis"
ON public.guardians
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role = 'secretaria'
  )
);

-- Trigger para updated_at em guardians
CREATE TRIGGER update_guardians_updated_at
BEFORE UPDATE ON public.guardians
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Criar tabela programs
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  curriculum_mode TEXT NOT NULL DEFAULT 'SUBJECTS' CHECK (curriculum_mode IN ('SUBJECTS', 'MODALITIES')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Políticas para secretaria ter acesso completo
CREATE POLICY "Secretaria can view all programs" ON public.programs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'secretaria'
  )
);

CREATE POLICY "Secretaria can create programs" ON public.programs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'secretaria'
  )
);

CREATE POLICY "Secretaria can update programs" ON public.programs
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'secretaria'
  )
);

CREATE POLICY "Secretaria can delete programs" ON public.programs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'secretaria'
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- ========================================
-- MIGRAÇÃO: Sistema de Roles Seguro
-- ========================================

-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('secretaria', 'professor', 'aluno');

-- 2. Criar tabela user_roles (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Criar função security definer para verificar roles (evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Migrar dados existentes da tabela profiles para user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.profiles
WHERE role IN ('secretaria', 'professor', 'aluno')
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Políticas RLS para user_roles
CREATE POLICY "Usuários podem ver suas próprias roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Secretaria pode gerenciar roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'secretaria'));

-- 7. Atualizar políticas da tabela profiles para usar has_role
DROP POLICY IF EXISTS "Secretaria pode criar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Secretaria pode atualizar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Secretaria pode ver todos os perfis" ON public.profiles;

CREATE POLICY "Secretaria pode criar perfis"
ON public.profiles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'secretaria'));

CREATE POLICY "Secretaria pode atualizar perfis"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'secretaria'));

CREATE POLICY "Secretaria pode ver todos os perfis"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'secretaria'));

-- 8. Atualizar outras tabelas críticas para usar has_role
DROP POLICY IF EXISTS "Secretaria pode gerenciar Turmas" ON public.classes;
CREATE POLICY "Secretaria pode gerenciar Turmas"
ON public.classes
FOR ALL
USING (public.has_role(auth.uid(), 'secretaria'));

DROP POLICY IF EXISTS "Secretaria pode gerenciar Alunos de Turmas" ON public.class_students;
CREATE POLICY "Secretaria pode gerenciar Alunos de Turmas"
ON public.class_students
FOR ALL
USING (public.has_role(auth.uid(), 'secretaria'));

-- 9. Trigger para criar role automaticamente quando um novo usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir role baseado no metadata do usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'aluno')::app_role
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa após inserção na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- 10. Comentários para documentação
COMMENT ON TABLE public.user_roles IS 'Tabela separada para roles de usuários - previne escalação de privilégios';
COMMENT ON FUNCTION public.has_role IS 'Função security definer para verificar roles sem recursão de RLS';
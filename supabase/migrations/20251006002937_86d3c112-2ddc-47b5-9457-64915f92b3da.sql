-- Criar função security definer para verificar role sem recursão
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id;
$$;

-- Remover a política problemática
DROP POLICY IF EXISTS "Secretaria pode gerenciar todos os perfis" ON public.profiles;

-- Recriar a política usando a função security definer
CREATE POLICY "Secretaria pode gerenciar todos os perfis"
ON public.profiles
FOR ALL
USING (public.get_user_role(auth.uid()) = 'secretaria')
WITH CHECK (public.get_user_role(auth.uid()) = 'secretaria');
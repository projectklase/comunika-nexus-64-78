-- Remover apenas a política problemática que causa recursão
DROP POLICY IF EXISTS "Secretaria pode ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Secretaria pode atualizar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Secretaria pode criar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Secretaria pode gerenciar todos os perfis" ON public.profiles;

-- Recriar usando a função security definer
CREATE POLICY "Secretaria pode ver todos os perfis"
ON public.profiles
FOR SELECT
USING (public.get_user_role(auth.uid()) = 'secretaria');

CREATE POLICY "Secretaria pode atualizar perfis"
ON public.profiles
FOR UPDATE
USING (public.get_user_role(auth.uid()) = 'secretaria');

CREATE POLICY "Secretaria pode criar perfis"
ON public.profiles
FOR INSERT
WITH CHECK (public.get_user_role(auth.uid()) = 'secretaria');
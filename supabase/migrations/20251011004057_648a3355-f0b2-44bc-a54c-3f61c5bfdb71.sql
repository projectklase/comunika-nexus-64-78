-- Correção 3: Adicionar política RLS para INSERT em user_roles via trigger
-- Isso garante que o trigger handle_new_user_role possa inserir roles sem problemas

CREATE POLICY "Sistema pode criar roles via trigger"
ON public.user_roles
FOR INSERT
WITH CHECK (true);

-- Comentário: Esta política permite que o trigger SECURITY DEFINER
-- insira roles durante a criação de usuários sem problemas de permissão
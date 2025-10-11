-- Corrigir o trigger handle_new_user para não inserir a coluna role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Inserir perfil sem a coluna role (role é armazenada em user_roles)
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Novo Usuário'),
    NEW.email
  );
  RETURN NEW;
END;
$$;
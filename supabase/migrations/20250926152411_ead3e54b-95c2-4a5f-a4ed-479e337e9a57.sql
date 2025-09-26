-- Garantir que a trigger de criação de profile está funcionando
-- Primeiro, verificar se existe e recriar se necessário

-- Drop the existing trigger and function to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Novo Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'aluno')
  );
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up any existing professor user to avoid conflicts
DELETE FROM auth.users WHERE email = 'professor@exemplo.com';
DELETE FROM public.profiles WHERE email = 'professor@exemplo.com';

-- Create a trigger function that automatically grants superadmin role to the designated email
CREATE OR REPLACE FUNCTION public.grant_superadmin_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user has the designated superadmin email
  IF NEW.email = 'lucas.edugb@gmail.com' THEN
    -- Insert superadmin role if not already exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'superadmin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to grant superadmin on signup
DROP TRIGGER IF EXISTS grant_superadmin_trigger ON auth.users;
CREATE TRIGGER grant_superadmin_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_superadmin_on_signup();

-- Also grant superadmin if the user already exists
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user with this email already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'lucas.edugb@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Grant superadmin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'superadmin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create profile if not exists
    INSERT INTO public.profiles (id, email, name)
    VALUES (v_user_id, 'lucas.edugb@gmail.com', 'Super Admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

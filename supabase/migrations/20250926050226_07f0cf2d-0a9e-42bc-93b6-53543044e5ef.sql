-- Clean up any existing users and profiles
DELETE FROM public.profiles WHERE email IN ('secretaria@comunika.com');
DELETE FROM auth.users WHERE email IN ('secretaria@comunika.com');
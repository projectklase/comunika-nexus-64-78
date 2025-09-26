-- Delete existing user if exists
DELETE FROM public.profiles WHERE email = 'secretaria@comunika.com';
DELETE FROM auth.users WHERE email = 'secretaria@comunika.com';

-- Insert user directly with proper password hash format that Supabase Auth expects
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'secretaria@comunika.com',
  '$2a$10$' || encode(digest('123456' || 'salt', 'sha256'), 'hex'),
  now(),
  now(),
  now(),
  '{"name": "Maria Silva", "role": "secretaria"}'::jsonb,
  'authenticated',
  'authenticated'
);
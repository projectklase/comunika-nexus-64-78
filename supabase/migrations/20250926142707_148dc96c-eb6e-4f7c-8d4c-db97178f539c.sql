-- Step 3: Create Professor and Aluno test users
-- Create professor user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'professor@exemplo.com',
  crypt('123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '{"name": "Professor Exemplo", "role": "professor"}'::jsonb
);

-- Create aluno user  
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'aluno@exemplo.com',
  crypt('123456', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '{"name": "Aluno Exemplo", "role": "aluno"}'::jsonb
);

-- The profiles will be automatically created via the handle_new_user() trigger
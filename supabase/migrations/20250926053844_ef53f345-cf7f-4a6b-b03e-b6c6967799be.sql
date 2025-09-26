-- Corrigir o problema de email não confirmado para secretaria
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = 'secretaria@comunika.com';
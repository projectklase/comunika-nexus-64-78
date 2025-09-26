-- Delete the incorrectly created test users
DELETE FROM auth.users WHERE email IN ('professor@exemplo.com', 'aluno@exemplo.com');
-- The profiles will be automatically deleted due to CASCADE constraint
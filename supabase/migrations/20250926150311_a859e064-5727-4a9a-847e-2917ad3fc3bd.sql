-- Verificação #1: Limpeza completa e recriação segura do usuário Professor
-- Deletar completamente qualquer vestígio do usuário professor@exemplo.com
DELETE FROM auth.users WHERE email = 'professor@exemplo.com';
DELETE FROM public.profiles WHERE email = 'professor@exemplo.com';
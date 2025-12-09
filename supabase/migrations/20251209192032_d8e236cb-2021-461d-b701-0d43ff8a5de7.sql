-- Remover a view battle_profiles que tem SECURITY DEFINER problemático
-- A função get_battle_opponent_profile() já fornece acesso seguro aos dados

DROP VIEW IF EXISTS public.battle_profiles;
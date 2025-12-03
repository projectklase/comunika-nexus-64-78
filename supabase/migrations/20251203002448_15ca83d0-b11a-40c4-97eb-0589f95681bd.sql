-- Remove the old version of open_card_pack (without p_is_free parameter)
-- This resolves the "function overloading ambiguity" error
DROP FUNCTION IF EXISTS public.open_card_pack(uuid, text);
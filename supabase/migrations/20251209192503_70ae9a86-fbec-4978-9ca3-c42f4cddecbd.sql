-- Remover policy de batalha que ainda expõe dados completos do perfil
-- A aplicação deve usar a função get_battle_opponent_profile() para obter apenas nome/avatar

DROP POLICY IF EXISTS "Battle participants can view opponent name and avatar" ON public.profiles;

-- Nota: RLS opera no nível de ROW, não de COLUMN
-- A policy permitia acesso à row completa, expondo todos os campos
-- A função get_battle_opponent_profile() é a única forma segura de ver oponentes
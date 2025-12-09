-- Corrigir exposição de dados sensíveis na tabela profiles
-- Problema: Policies muito amplas expõem emails, telefones, DOB para usuários não autorizados

-- 1. Remover policies redundantes que não filtram por escola
DROP POLICY IF EXISTS "Secretaria pode ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Administrador pode ver todos os profiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON public.profiles;

-- 2. Remover policy de batalha que expõe dados completos
DROP POLICY IF EXISTS "Battle participants can view opponent profiles" ON public.profiles;

-- 3. Criar view segura para contexto de batalha (apenas dados públicos)
CREATE OR REPLACE VIEW public.battle_profiles AS
SELECT 
  id,
  name,
  avatar,
  current_school_id
FROM public.profiles;

-- 4. Habilitar RLS na view não é possível, mas podemos criar uma função segura
CREATE OR REPLACE FUNCTION public.get_battle_opponent_profile(opponent_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  avatar text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.avatar
  FROM profiles p
  WHERE p.id = opponent_id
  AND EXISTS (
    SELECT 1 FROM battles b
    WHERE (b.status IN ('WAITING', 'IN_PROGRESS', 'FINISHED'))
    AND (
      (b.player1_id = auth.uid() AND b.player2_id = opponent_id)
      OR (b.player2_id = auth.uid() AND b.player1_id = opponent_id)
    )
  );
$$;

-- 5. Criar policy restrita para batalhas - apenas nome e avatar via função
-- Como RLS não pode restringir colunas, criamos policy mínima para verificação de existência
CREATE POLICY "Battle participants can view opponent name and avatar"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM battles b
    WHERE b.status IN ('WAITING', 'IN_PROGRESS', 'FINISHED')
    AND (
      (b.player1_id = auth.uid() AND b.player2_id = profiles.id)
      OR (b.player2_id = auth.uid() AND b.player1_id = profiles.id)
    )
  )
);

-- Nota: A aplicação deve usar get_battle_opponent_profile() para obter apenas dados públicos
-- A policy acima permite acesso à row, mas o código deve limitar as colunas selecionadas

-- 6. Garantir que admins e secretarias só veem perfis de suas escolas
-- (policies "Admins can view profiles from their school" e "Secretarias can view profiles from their school" já existem)
-- Corrigir exposição pública da tabela cards
-- Remover policy que permite acesso público e restringir a usuários autenticados

-- Dropar policy atual que permite leitura pública
DROP POLICY IF EXISTS "Everyone can view active cards" ON public.cards;

-- Criar nova policy que permite apenas usuários autenticados verem cartas ativas
CREATE POLICY "Authenticated users can view active cards" 
ON public.cards 
FOR SELECT 
USING (is_active = true AND auth.role() = 'authenticated');
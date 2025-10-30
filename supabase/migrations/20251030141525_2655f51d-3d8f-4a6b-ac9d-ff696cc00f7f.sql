-- Permitir que todos os usuários autenticados possam ler configurações da escola
-- (são dados de configuração, não dados sensíveis de usuários)
CREATE POLICY "Usuários autenticados podem ler configurações da escola" 
ON public.school_settings 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Inserir configuração padrão se não existir
INSERT INTO public.school_settings (key, value, description)
VALUES (
  'use_activity_weights',
  '{"enabled": true}'::jsonb,
  'Configuração para habilitar/desabilitar peso nas atividades'
)
ON CONFLICT (key) DO NOTHING;
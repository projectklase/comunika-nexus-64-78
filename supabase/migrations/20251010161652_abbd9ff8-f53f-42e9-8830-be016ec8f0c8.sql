-- ============================================
-- FASE 3: MELHORIAS DE UX
-- System Logs e Feature Flags
-- ============================================

-- Tabela de logs do sistema
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id) WHERE user_id IS NOT NULL;

-- RLS para system_logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Apenas secretaria pode ver logs do sistema
CREATE POLICY "Secretaria pode ver logs do sistema"
ON system_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'secretaria'
  )
);

-- Sistema pode inserir logs (via edge function)
CREATE POLICY "Sistema pode inserir logs"
ON system_logs FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- ============================================
-- Feature Flags
-- ============================================

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS para feature_flags
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Todos podem ver feature flags
CREATE POLICY "Todos podem ver feature flags"
ON feature_flags FOR SELECT
TO authenticated
USING (true);

-- Apenas secretaria pode atualizar feature flags
CREATE POLICY "Secretaria pode atualizar feature flags"
ON feature_flags FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'secretaria'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'secretaria'
  )
);

-- Apenas secretaria pode inserir feature flags
CREATE POLICY "Secretaria pode inserir feature flags"
ON feature_flags FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'secretaria'
  )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();

-- Inserir feature flags iniciais
INSERT INTO feature_flags (key, enabled, description, config) VALUES
  ('notifications_email', false, 'Habilitar notificações por email', '{"provider": "smtp"}'::jsonb),
  ('notifications_push', false, 'Habilitar notificações push', '{"provider": "firebase"}'::jsonb),
  ('theme_switch', false, 'Permitir troca de tema (claro/escuro)', '{}'::jsonb),
  ('i18n', false, 'Internacionalização', '{"languages": ["pt-BR", "en-US"]}'::jsonb),
  ('advanced_analytics', true, 'Analytics avançado para professores', '{}'::jsonb),
  ('file_compression', true, 'Compressão automática de arquivos enviados', '{"max_size": 5242880}'::jsonb),
  ('maintenance_mode', false, 'Modo de manutenção', '{"message": "Sistema em manutenção"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Função para limpar logs antigos (execução manual)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_system_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM system_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
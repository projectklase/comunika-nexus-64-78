-- Fase 1: Adicionar coluna weekly_checkins para persistir progresso semanal
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_checkins JSONB DEFAULT '{}';

-- Adicionar comentário explicativo
COMMENT ON COLUMN profiles.weekly_checkins IS 'Armazena check-ins diários da semana {data: true/false}';
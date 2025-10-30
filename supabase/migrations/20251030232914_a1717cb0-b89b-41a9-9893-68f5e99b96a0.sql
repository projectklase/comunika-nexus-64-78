-- ============================================================
-- FASE 1: Schema + CRON Job para Insights Diários de IA
-- ============================================================

-- 1. Adicionar configuração para armazenar insights da IA
INSERT INTO public.school_settings (key, value, description)
VALUES (
  'ai_daily_briefing',
  '{"insights": null, "generatedAt": null}'::jsonb,
  'Análise diária automatizada gerada por IA com insights preditivos'
)
ON CONFLICT (key) DO NOTHING;

-- 2. Habilitar pg_cron (se já não estiver)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Conceder permissões necessárias
GRANT USAGE ON SCHEMA cron TO postgres;

-- 4. Agendar job diário às 3h UTC (0h BRT)
SELECT cron.schedule(
  'daily-ai-briefing-job',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yanspolqarficibgovia.supabase.co/functions/v1/generate-daily-briefing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbnNwb2xxYXJmaWNpYmdvdmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NTczMjUsImV4cCI6MjA3NDQzMzMyNX0.QMU9Bxjl9NzyrSgUKeHE0HgcSsBUeFQefjQIoEczRYM'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
-- Habilitar extensões necessárias para CRON
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar renovação de desafios diariamente às 00:00 UTC (21:00 BRT)
SELECT cron.schedule(
  'renew-daily-weekly-challenges',
  '0 0 * * *', -- Todos os dias à meia-noite UTC
  $$
  SELECT
    net.http_post(
      url:='https://yanspolqarficibgovia.supabase.co/functions/v1/renew-daily-weekly-challenges',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbnNwb2xxYXJmaWNpYmdvdmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NTczMjUsImV4cCI6MjA3NDQzMzMyNX0.QMU9Bxjl9NzyrSgUKeHE0HgcSsBUeFQefjQIoEczRYM"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
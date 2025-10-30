-- Agendar atualização de login streaks diariamente às 00:05 UTC
-- (5 minutos depois da renovação de desafios para não sobrecarregar)
SELECT cron.schedule(
  'update-login-streaks',
  '5 0 * * *', -- Todos os dias às 00:05 UTC
  $$
  SELECT
    net.http_post(
      url:='https://yanspolqarficibgovia.supabase.co/functions/v1/update-login-streaks',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbnNwb2xxYXJmaWNpYmdvdmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NTczMjUsImV4cCI6MjA3NDQzMzMyNX0.QMU9Bxjl9NzyrSgUKeHE0HgcSsBUeFQefjQIoEczRYM"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
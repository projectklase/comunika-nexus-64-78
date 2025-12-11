-- Schedule CRON job to run auto_archive_expired_posts daily at 3:00 AM UTC
SELECT cron.schedule(
  'auto-archive-expired-posts',
  '0 3 * * *',
  $$SELECT public.auto_archive_expired_posts();$$
);
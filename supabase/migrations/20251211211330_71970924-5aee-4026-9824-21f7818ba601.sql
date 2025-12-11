-- Execute auto_archive_expired_posts immediately to clean up old posts
DO $$
DECLARE
  result integer;
BEGIN
  SELECT public.auto_archive_expired_posts() INTO result;
  RAISE NOTICE 'Auto-archive executed: % posts processed', result;
END $$;
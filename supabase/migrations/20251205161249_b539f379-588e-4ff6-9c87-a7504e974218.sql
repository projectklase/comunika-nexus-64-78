-- Create RPC function to auto-archive expired posts
CREATE OR REPLACE FUNCTION public.auto_archive_expired_posts(p_school_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  WITH posts_to_archive AS (
    SELECT id FROM posts
    WHERE status = 'PUBLISHED'
      AND (p_school_id IS NULL OR school_id = p_school_id)
      AND (
        -- EVENTO: expirado se event_end_at passou ou event_start_at passou (sem end) ou 7 dias sem datas
        (type = 'EVENTO' AND (
          (event_end_at IS NOT NULL AND event_end_at < NOW()) OR
          (event_start_at IS NOT NULL AND event_end_at IS NULL AND event_start_at < NOW()) OR
          (event_start_at IS NULL AND event_end_at IS NULL AND created_at < NOW() - INTERVAL '7 days')
        ))
        OR
        -- ATIVIDADE/TRABALHO/PROVA: expirado se due_at passou ou 14 dias sem due_at
        (type IN ('ATIVIDADE', 'TRABALHO', 'PROVA') AND (
          (due_at IS NOT NULL AND due_at < NOW()) OR
          (due_at IS NULL AND created_at < NOW() - INTERVAL '14 days')
        ))
        OR
        -- AVISO/COMUNICADO: expirado após 30 dias
        (type IN ('AVISO', 'COMUNICADO') AND created_at < NOW() - INTERVAL '30 days')
      )
  )
  UPDATE posts 
  SET status = 'ARCHIVED', updated_at = NOW()
  WHERE id IN (SELECT id FROM posts_to_archive);
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

-- Create function to preview posts that would be archived (without archiving)
CREATE OR REPLACE FUNCTION public.preview_expired_posts(p_school_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  title TEXT,
  type TEXT,
  created_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  event_start_at TIMESTAMPTZ,
  event_end_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.title, p.type, p.created_at, p.due_at, p.event_start_at, p.event_end_at
  FROM posts p
  WHERE p.status = 'PUBLISHED'
    AND (p_school_id IS NULL OR p.school_id = p_school_id)
    AND (
      -- EVENTO
      (p.type = 'EVENTO' AND (
        (p.event_end_at IS NOT NULL AND p.event_end_at < NOW()) OR
        (p.event_start_at IS NOT NULL AND p.event_end_at IS NULL AND p.event_start_at < NOW()) OR
        (p.event_start_at IS NULL AND p.event_end_at IS NULL AND p.created_at < NOW() - INTERVAL '7 days')
      ))
      OR
      -- ATIVIDADE/TRABALHO/PROVA
      (p.type IN ('ATIVIDADE', 'TRABALHO', 'PROVA') AND (
        (p.due_at IS NOT NULL AND p.due_at < NOW()) OR
        (p.due_at IS NULL AND p.created_at < NOW() - INTERVAL '14 days')
      ))
      OR
      -- AVISO/COMUNICADO
      (p.type IN ('AVISO', 'COMUNICADO') AND p.created_at < NOW() - INTERVAL '30 days')
    )
  ORDER BY p.created_at ASC;
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
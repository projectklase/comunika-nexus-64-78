-- Update auto_archive_expired_posts function to use 20 days for AVISO/COMUNICADO
CREATE OR REPLACE FUNCTION public.auto_archive_expired_posts(p_school_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  archived_count integer := 0;
  deleted_count integer := 0;
BEGIN
  -- Phase 1: Archive CONCLUDED posts after 10 days
  WITH concluded_to_archive AS (
    UPDATE posts
    SET status = 'ARCHIVED',
        updated_at = NOW()
    WHERE status = 'CONCLUDED'
      AND (p_school_id IS NULL OR school_id = p_school_id)
      AND (meta->>'concluded_at')::timestamptz < NOW() - INTERVAL '10 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM concluded_to_archive;

  -- Phase 2: Delete ARCHIVED posts after 30 days
  WITH archived_to_delete AS (
    DELETE FROM posts
    WHERE status = 'ARCHIVED'
      AND (p_school_id IS NULL OR school_id = p_school_id)
      AND updated_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM archived_to_delete;

  -- Phase 3: Auto-archive expired PUBLISHED posts
  -- EVENTO: after event_end_at or 7 days after creation if no dates
  -- ATIVIDADE/TRABALHO/PROVA: after due_at or 14 days if no due_at
  -- AVISO/COMUNICADO: 20 days after creation (updated from 30)
  WITH expired_to_archive AS (
    UPDATE posts
    SET status = 'ARCHIVED',
        updated_at = NOW()
    WHERE status = 'PUBLISHED'
      AND (p_school_id IS NULL OR school_id = p_school_id)
      AND (
        -- EVENTO: event ended or 7 days without dates
        (type = 'EVENTO' AND (
          (event_end_at IS NOT NULL AND event_end_at < NOW()) OR
          (event_end_at IS NULL AND event_start_at IS NULL AND created_at < NOW() - INTERVAL '7 days')
        ))
        OR
        -- ATIVIDADE/TRABALHO/PROVA: past due or 14 days if no due_at
        (type IN ('ATIVIDADE', 'TRABALHO', 'PROVA') AND (
          (due_at IS NOT NULL AND due_at < NOW() - INTERVAL '14 days') OR
          (due_at IS NULL AND created_at < NOW() - INTERVAL '14 days')
        ))
        OR
        -- AVISO/COMUNICADO: 20 days after creation (updated from 30)
        (type IN ('AVISO', 'COMUNICADO') AND created_at < NOW() - INTERVAL '20 days')
      )
    RETURNING id
  )
  SELECT archived_count + COUNT(*) INTO archived_count FROM expired_to_archive;

  RAISE NOTICE 'Auto-archive: % posts archived, % posts deleted', archived_count, deleted_count;
  
  RETURN archived_count + deleted_count;
END;
$$;
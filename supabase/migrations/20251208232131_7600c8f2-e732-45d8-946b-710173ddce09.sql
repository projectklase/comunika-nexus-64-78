-- Create platform_announcements table
CREATE TABLE IF NOT EXISTS platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon_name TEXT DEFAULT 'Megaphone',
  theme_color TEXT DEFAULT '#8B5CF6',
  banner_url TEXT,
  target_schools UUID[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  sent_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- Only superadmins can manage announcements
CREATE POLICY "Superadmins can manage announcements"
ON platform_announcements FOR ALL
USING (is_superadmin(auth.uid()));

-- Add PLATFORM_ANNOUNCEMENT to notification types
COMMENT ON TABLE platform_announcements IS 'Platform-wide announcements sent by Super Admin';

-- Create RPC to send platform announcement
CREATE OR REPLACE FUNCTION send_platform_announcement(
  p_title TEXT,
  p_message TEXT,
  p_icon_name TEXT DEFAULT 'Megaphone',
  p_theme_color TEXT DEFAULT '#8B5CF6',
  p_banner_url TEXT DEFAULT NULL,
  p_target_schools UUID[] DEFAULT '{}',
  p_target_roles TEXT[] DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_announcement_id UUID;
  v_user_ids UUID[];
  v_notifications_created INT := 0;
  v_user_id UUID;
BEGIN
  -- Verify caller is superadmin
  IF NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Only superadmins can send platform announcements';
  END IF;

  -- Create the announcement record
  INSERT INTO platform_announcements (title, message, icon_name, theme_color, banner_url, target_schools, target_roles, sent_by)
  VALUES (p_title, p_message, p_icon_name, p_theme_color, p_banner_url, p_target_schools, p_target_roles, auth.uid())
  RETURNING id INTO v_announcement_id;

  -- Get target user IDs based on filters
  IF array_length(p_target_schools, 1) IS NULL AND array_length(p_target_roles, 1) IS NULL THEN
    -- All users
    SELECT array_agg(DISTINCT p.id) INTO v_user_ids
    FROM profiles p
    WHERE p.is_active = true;
  ELSIF array_length(p_target_schools, 1) IS NULL AND array_length(p_target_roles, 1) > 0 THEN
    -- All schools, specific roles
    SELECT array_agg(DISTINCT sm.user_id) INTO v_user_ids
    FROM school_memberships sm
    JOIN profiles p ON p.id = sm.user_id
    WHERE p.is_active = true
      AND sm.role = ANY(p_target_roles);
  ELSIF array_length(p_target_schools, 1) > 0 AND array_length(p_target_roles, 1) IS NULL THEN
    -- Specific schools, all roles
    SELECT array_agg(DISTINCT sm.user_id) INTO v_user_ids
    FROM school_memberships sm
    JOIN profiles p ON p.id = sm.user_id
    WHERE p.is_active = true
      AND sm.school_id = ANY(p_target_schools);
  ELSE
    -- Specific schools AND specific roles
    SELECT array_agg(DISTINCT sm.user_id) INTO v_user_ids
    FROM school_memberships sm
    JOIN profiles p ON p.id = sm.user_id
    WHERE p.is_active = true
      AND sm.school_id = ANY(p_target_schools)
      AND sm.role = ANY(p_target_roles);
  END IF;

  -- Create notifications for each user
  IF v_user_ids IS NOT NULL THEN
    FOREACH v_user_id IN ARRAY v_user_ids
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        meta,
        is_read
      ) VALUES (
        v_user_id,
        'PLATFORM_ANNOUNCEMENT',
        p_title,
        p_message,
        jsonb_build_object(
          'announcement_id', v_announcement_id,
          'icon_name', p_icon_name,
          'theme_color', p_theme_color,
          'banner_url', p_banner_url
        ),
        false
      );
      v_notifications_created := v_notifications_created + 1;
    END LOOP;
  END IF;

  -- Log audit event
  INSERT INTO platform_audit_logs (
    superadmin_id,
    action,
    entity_type,
    entity_id,
    entity_label,
    details
  ) VALUES (
    auth.uid(),
    'SEND_ANNOUNCEMENT',
    'platform_announcement',
    v_announcement_id::text,
    p_title,
    jsonb_build_object(
      'target_schools', p_target_schools,
      'target_roles', p_target_roles,
      'notifications_created', v_notifications_created
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'announcement_id', v_announcement_id,
    'notifications_created', v_notifications_created
  );
END;
$$;

-- Create function to get announcement stats
CREATE OR REPLACE FUNCTION get_announcement_stats(p_announcement_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_read INT;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_read = true)
  INTO v_total, v_read
  FROM notifications
  WHERE meta->>'announcement_id' = p_announcement_id::text
    AND type = 'PLATFORM_ANNOUNCEMENT';

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'read', COALESCE(v_read, 0),
    'unread', COALESCE(v_total, 0) - COALESCE(v_read, 0)
  );
END;
$$;
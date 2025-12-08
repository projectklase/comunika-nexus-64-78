-- Drop all existing versions of send_platform_announcement to resolve overload conflict
DROP FUNCTION IF EXISTS public.send_platform_announcement(TEXT, TEXT, UUID[], TEXT[], TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.send_platform_announcement(TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], TEXT[]);

-- Recreate the function with correct signature (RETURNS JSON) and fixed entity_id type
CREATE OR REPLACE FUNCTION public.send_platform_announcement(
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
SET search_path TO 'public'
AS $$
DECLARE
  v_announcement_id UUID;
  v_user_record RECORD;
  v_sent_by UUID;
  v_notifications_created INT := 0;
BEGIN
  -- Get the current user
  v_sent_by := auth.uid();
  
  IF v_sent_by IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create the announcement
  INSERT INTO platform_announcements (
    title,
    message,
    target_schools,
    target_roles,
    icon_name,
    theme_color,
    banner_url,
    sent_by,
    is_active
  ) VALUES (
    p_title,
    p_message,
    CASE WHEN p_target_schools = '{}' THEN NULL ELSE p_target_schools END,
    CASE WHEN p_target_roles = '{}' THEN NULL ELSE p_target_roles END,
    p_icon_name,
    p_theme_color,
    p_banner_url,
    v_sent_by,
    true
  )
  RETURNING id INTO v_announcement_id;

  -- Create notifications for targeted users
  FOR v_user_record IN
    SELECT DISTINCT p.id, p.email
    FROM profiles p
    JOIN school_memberships sm ON sm.user_id = p.id
    WHERE 
      p.is_active = true
      AND (
        -- If no schools specified, send to all
        p_target_schools IS NULL 
        OR p_target_schools = '{}'
        OR array_length(p_target_schools, 1) IS NULL
        OR sm.school_id = ANY(p_target_schools)
      )
      AND (
        -- If no roles specified, send to all
        p_target_roles IS NULL 
        OR p_target_roles = '{}'
        OR array_length(p_target_roles, 1) IS NULL
        OR sm.role = ANY(p_target_roles)
      )
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      meta,
      is_read
    ) VALUES (
      v_user_record.id,
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

  -- Log the action in platform_audit_logs (entity_id is UUID, no ::text conversion)
  INSERT INTO platform_audit_logs (
    superadmin_id,
    action,
    entity_type,
    entity_id,
    entity_label,
    details
  ) VALUES (
    v_sent_by,
    'CREATE',
    'announcement',
    v_announcement_id,
    p_title,
    jsonb_build_object(
      'notifications_sent', v_notifications_created,
      'target_schools', p_target_schools,
      'target_roles', p_target_roles
    )
  );

  -- Return JSON as expected by frontend
  RETURN jsonb_build_object(
    'success', true,
    'announcement_id', v_announcement_id,
    'notifications_created', v_notifications_created
  );
END;
$$;
-- ============================================================================
-- MIGRATION: Force Password Reset for Exposed Accounts
-- Date: 2025-11-24
-- Security Level: CRITICAL
-- 
-- Context:
-- Hardcoded credentials were found exposed in the frontend codebase (Login.tsx)
-- exposing real user accounts to potential unauthorized access.
--
-- Affected Accounts:
-- - secretaria@comunika.com
-- - julianegrini@gmail.com  
-- - alinemenezes@gmail.com
-- - admin.klase@comunika.com
--
-- Action:
-- Force immediate password reset by setting must_change_password = true
-- This will redirect users to /alterar-senha on next login attempt
-- ============================================================================

-- Update profiles to force password change
UPDATE profiles
SET 
  must_change_password = true,
  updated_at = now()
WHERE email IN (
  'secretaria@comunika.com',
  'julianegrini@gmail.com',
  'alinemenezes@gmail.com',
  'admin.klase@comunika.com'
);

-- Log security event in audit table
DO $$
DECLARE
  v_school_id uuid;
BEGIN
  -- Get first active school for audit logging (multi-tenant context)
  SELECT id INTO v_school_id FROM schools WHERE is_active = true LIMIT 1;
  
  -- Insert audit event for each affected user
  INSERT INTO audit_events (
    action,
    entity,
    entity_label,
    actor_name,
    actor_email,
    actor_role,
    school_id,
    meta,
    scope
  )
  SELECT
    'SECURITY_PASSWORD_RESET_FORCED',
    'USER',
    p.name,
    'SYSTEM',
    'security@system',
    'administrador',
    v_school_id,
    jsonb_build_object(
      'reason', 'Credentials exposed in frontend codebase',
      'affected_email', p.email,
      'severity', 'CRITICAL',
      'automated', true
    ),
    'SECURITY_INCIDENT'
  FROM profiles p
  WHERE p.email IN (
    'secretaria@comunika.com',
    'julianegrini@gmail.com',
    'alinemenezes@gmail.com',
    'admin.klase@comunika.com'
  );
END $$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.must_change_password IS 
  'Flag indicating user must change password on next login. Set to true for security incidents or initial account creation.';
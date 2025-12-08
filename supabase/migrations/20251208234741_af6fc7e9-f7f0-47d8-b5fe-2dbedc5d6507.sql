-- Fix NULL values in platform_announcements arrays
UPDATE platform_announcements 
SET target_schools = '{}' 
WHERE target_schools IS NULL;

UPDATE platform_announcements 
SET target_roles = '{}' 
WHERE target_roles IS NULL;

-- Alter columns to NOT NULL with default empty array
ALTER TABLE platform_announcements 
  ALTER COLUMN target_schools SET NOT NULL,
  ALTER COLUMN target_schools SET DEFAULT '{}';

ALTER TABLE platform_announcements 
  ALTER COLUMN target_roles SET NOT NULL,
  ALTER COLUMN target_roles SET DEFAULT '{}';
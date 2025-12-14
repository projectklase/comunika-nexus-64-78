-- Add general_notes column for quick admin observations
ALTER TABLE admin_subscriptions 
ADD COLUMN IF NOT EXISTS general_notes TEXT;
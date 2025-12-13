-- Add idempotency flag to prevent duplicate payment emails
ALTER TABLE admin_subscriptions 
ADD COLUMN IF NOT EXISTS payment_email_sent BOOLEAN DEFAULT false;
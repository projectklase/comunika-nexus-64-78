-- Drop existing constraint and recreate with pending_payment status
ALTER TABLE admin_subscriptions DROP CONSTRAINT IF EXISTS admin_subscriptions_status_check;

ALTER TABLE admin_subscriptions ADD CONSTRAINT admin_subscriptions_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'canceled'::text, 'expired'::text, 'trial'::text, 'pending_payment'::text]));
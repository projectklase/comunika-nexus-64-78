-- Fase 1: Corrigir constraint para aceitar pending_payment
ALTER TABLE admin_subscriptions 
DROP CONSTRAINT IF EXISTS admin_subscriptions_status_check;

ALTER TABLE admin_subscriptions 
ADD CONSTRAINT admin_subscriptions_status_check 
CHECK (status = ANY (ARRAY['active', 'canceled', 'expired', 'trial', 'pending_payment']));

-- Fase 3: Atualizar assinatura atual para Legend (pagamento já confirmado no Stripe)
UPDATE admin_subscriptions 
SET 
  plan_id = (SELECT id FROM subscription_plans WHERE slug = 'legend'),
  stripe_customer_id = 'cus_TaspdZ2y1XvUBh',
  stripe_subscription_id = 'sub_1Sdh3hCs06MIouz0R9O6w95Q',
  status = 'active'
WHERE admin_id = 'f905cbb2-30ea-45ae-be68-b85f4f6180d9';
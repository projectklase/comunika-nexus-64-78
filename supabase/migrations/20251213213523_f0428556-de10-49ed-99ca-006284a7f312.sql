-- Adicionar coluna para senha temporária (usada no fluxo de link de pagamento)
ALTER TABLE admin_subscriptions 
ADD COLUMN IF NOT EXISTS temp_password TEXT;
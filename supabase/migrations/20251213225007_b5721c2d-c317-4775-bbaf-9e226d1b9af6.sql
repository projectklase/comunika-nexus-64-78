-- Adicionar campo para rastrear pagamento de implantação feito por fora
ALTER TABLE public.admin_subscriptions
ADD COLUMN IF NOT EXISTS implantation_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS implantation_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS implantation_notes TEXT;
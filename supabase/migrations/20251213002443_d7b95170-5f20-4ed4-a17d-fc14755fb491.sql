-- Criar tabela para armazenar dados fiscais de faturamento
CREATE TABLE public.billing_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  company_cnpj TEXT NOT NULL,
  company_address TEXT NOT NULL,
  company_number TEXT NOT NULL,
  company_neighborhood TEXT NOT NULL,
  company_zipcode TEXT NOT NULL,
  company_city TEXT NOT NULL,
  company_state TEXT NOT NULL,
  company_state_registration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.billing_info ENABLE ROW LEVEL SECURITY;

-- Policy: Superadmins podem ver todos
CREATE POLICY "Superadmins can manage all billing_info"
ON public.billing_info
FOR ALL
USING (public.is_superadmin(auth.uid()));

-- Policy: Admin pode ver e atualizar seus próprios dados
CREATE POLICY "Admins can view own billing_info"
ON public.billing_info
FOR SELECT
USING (admin_id = auth.uid());

CREATE POLICY "Admins can update own billing_info"
ON public.billing_info
FOR UPDATE
USING (admin_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_billing_info_updated_at
BEFORE UPDATE ON public.billing_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index para performance
CREATE INDEX idx_billing_info_admin_id ON public.billing_info(admin_id);
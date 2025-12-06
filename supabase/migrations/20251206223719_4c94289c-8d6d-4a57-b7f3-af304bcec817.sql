-- =============================================
-- MIGRAÇÃO: Atualizar Planos de Assinatura Klase
-- =============================================

-- Atualizar Básico -> Challenger
UPDATE public.subscription_plans SET
  name = 'Challenger',
  slug = 'challenger',
  price_cents = 127990,
  max_students = 300,
  included_schools = 1,
  addon_school_price_cents = 49700,
  features = '{"ai": true, "game": true, "events": true, "management": true, "description": "Ideal para escolas que estão começando ou unidades médias", "cost_per_student": "R$ 4,26"}'::jsonb,
  is_active = true,
  updated_at = now()
WHERE id = '986aed1b-ab0c-413a-b7c0-9bad616609af';

-- Atualizar Intermediário -> Master
UPDATE public.subscription_plans SET
  name = 'Master',
  slug = 'master',
  price_cents = 199790,
  max_students = 600,
  included_schools = 1,
  addon_school_price_cents = 49700,
  features = '{"ai": true, "game": true, "events": true, "management": true, "priority_support": false, "description": "Ideal para escolas consolidadas e cheias", "cost_per_student": "~R$ 3,30"}'::jsonb,
  is_active = true,
  updated_at = now()
WHERE id = '0c3bc335-ada5-4748-8fa6-85303d29f593';

-- Atualizar Avançado -> Legend
UPDATE public.subscription_plans SET
  name = 'Legend',
  slug = 'legend',
  price_cents = 289790,
  max_students = 1000,
  included_schools = 1,
  addon_school_price_cents = 49700,
  features = '{"ai": true, "game": true, "events": true, "management": true, "priority_support": true, "description": "Ideal para grandes operações ou donos de múltiplas franquias", "cost_per_student": "~R$ 2,89"}'::jsonb,
  is_active = true,
  updated_at = now()
WHERE id = 'da970915-6752-494e-bbe9-7e4e8404b04b';

-- Desativar Enterprise (não faz mais parte da oferta)
UPDATE public.subscription_plans SET
  is_active = false,
  updated_at = now()
WHERE id = '9c966196-b257-4087-aa7c-85f1953d6a6b';
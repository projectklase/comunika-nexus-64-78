-- ============================================================================
-- FASE 8: Criar Segunda Escola de Teste
-- ============================================================================

-- Criar Escola Norte (segunda escola para teste)
INSERT INTO public.schools (id, name, slug, logo_url, primary_color, is_active)
VALUES (
  'e8a5c123-4567-89ab-cdef-000000000002'::UUID,
  'Escola Norte',
  'escola-norte',
  NULL,
  '#3b82f6',
  true
);

-- Associar o administrador existente à Escola Norte
INSERT INTO public.school_memberships (school_id, user_id, role, is_primary)
VALUES (
  'e8a5c123-4567-89ab-cdef-000000000002'::UUID,
  'f905cbb2-30ea-45ae-be68-b85f4f6180d9'::UUID,  -- Admin Klase
  'administrador',
  false  -- is_primary = false porque a escola principal é a Klase
);

-- ============================================================================
-- FIM DA CRIAÇÃO DA ESCOLA DE TESTE
-- ============================================================================
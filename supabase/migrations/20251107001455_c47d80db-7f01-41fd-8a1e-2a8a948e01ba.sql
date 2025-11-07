-- ====================================
-- DADOS DE TESTE: Escola Norte
-- Criar dados distintivos para validar isolamento entre escolas
-- ====================================

-- 1. Inserir níveis na Escola Norte
INSERT INTO public.levels (id, name, code, school_id, is_active, display_order)
VALUES 
  (gen_random_uuid(), 'Ensino Médio', 'EM', 'e8a5c123-4567-89ab-cdef-000000000002', true, 1),
  (gen_random_uuid(), 'Ensino Superior', 'ES', 'e8a5c123-4567-89ab-cdef-000000000002', true, 2),
  (gen_random_uuid(), 'Pós-Graduação', 'PG', 'e8a5c123-4567-89ab-cdef-000000000002', true, 3);

-- 2. Inserir modalidades na Escola Norte
INSERT INTO public.modalities (id, name, code, school_id, is_active)
VALUES 
  (gen_random_uuid(), 'EAD', 'EAD', 'e8a5c123-4567-89ab-cdef-000000000002', true),
  (gen_random_uuid(), 'Semi-Presencial', 'SP', 'e8a5c123-4567-89ab-cdef-000000000002', true),
  (gen_random_uuid(), 'Presencial Noturno', 'PN', 'e8a5c123-4567-89ab-cdef-000000000002', true);

-- 3. Criar turmas com nomes bem diferentes
INSERT INTO public.classes (id, name, code, year, school_id, status, series)
VALUES 
  (gen_random_uuid(), 'Turma Alpha - EAD', 'ALPHA-2025', 2025, 'e8a5c123-4567-89ab-cdef-000000000002', 'Ativa', '3º Ano'),
  (gen_random_uuid(), 'Turma Beta - EAD', 'BETA-2025', 2025, 'e8a5c123-4567-89ab-cdef-000000000002', 'Ativa', '2º Ano'),
  (gen_random_uuid(), 'Turma Gamma - Presencial', 'GAMMA-2025', 2025, 'e8a5c123-4567-89ab-cdef-000000000002', 'Ativa', '1º Ano'),
  (gen_random_uuid(), 'Turma Delta - Noturno', 'DELTA-2025', 2025, 'e8a5c123-4567-89ab-cdef-000000000002', 'Ativa', 'MBA');

-- 4. Criar posts com títulos bem diferentes
INSERT INTO public.posts (
  id, title, body, type, status, audience, 
  author_id, author_name, author_role, school_id,
  created_at
)
VALUES 
  (
    gen_random_uuid(), 
    '🎓 Bem-vindo à Escola Norte!', 
    'Esta é a Escola Norte, uma escola de teste para validar o multi-tenancy. Aqui você encontrará conteúdo exclusivo desta instituição.', 
    'AVISO', 
    'PUBLISHED', 
    'GLOBAL',
    'f905cbb2-30ea-45ae-be68-b85f4f6180d9',
    'Administrador Norte',
    'administrador',
    'e8a5c123-4567-89ab-cdef-000000000002',
    NOW()
  ),
  (
    gen_random_uuid(), 
    '📚 Aula de Matemática Avançada', 
    'Conteúdo exclusivo da Escola Norte sobre cálculo diferencial e álgebra linear.', 
    'AULA', 
    'PUBLISHED', 
    'GLOBAL',
    'f905cbb2-30ea-45ae-be68-b85f4f6180d9',
    'Prof. Alexandre Norte',
    'professor',
    'e8a5c123-4567-89ab-cdef-000000000002',
    NOW()
  ),
  (
    gen_random_uuid(), 
    '🎉 Festa Junina da Escola Norte', 
    'Evento exclusivo da Escola Norte no dia 15 de junho. Venha participar!', 
    'EVENTO', 
    'PUBLISHED', 
    'GLOBAL',
    'f905cbb2-30ea-45ae-be68-b85f4f6180d9',
    'Coordenação Norte',
    'secretaria',
    'e8a5c123-4567-89ab-cdef-000000000002',
    NOW()
  ),
  (
    gen_random_uuid(), 
    '🏆 Competição de Robótica - Escola Norte', 
    'Inscrições abertas para a competição de robótica da Escola Norte. Participe!', 
    'EVENTO', 
    'PUBLISHED', 
    'GLOBAL',
    'f905cbb2-30ea-45ae-be68-b85f4f6180d9',
    'Prof. Robótica Norte',
    'professor',
    'e8a5c123-4567-89ab-cdef-000000000002',
    NOW()
  ),
  (
    gen_random_uuid(), 
    '📖 Atividade de Literatura Brasileira', 
    'Leitura e análise de Machado de Assis - exclusivo da Escola Norte.', 
    'ATIVIDADE', 
    'PUBLISHED', 
    'GLOBAL',
    'f905cbb2-30ea-45ae-be68-b85f4f6180d9',
    'Prof. Literatura Norte',
    'professor',
    'e8a5c123-4567-89ab-cdef-000000000002',
    NOW()
  );
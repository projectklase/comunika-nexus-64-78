-- =====================================================
-- MIGRATION: Índices para Sistema de Detecção de Duplicatas
-- =====================================================
-- Objetivo: Otimizar queries de verificação de duplicatas
-- para CPF, matrícula, nome, telefone, DOB e endereço
-- =====================================================

-- 1. Índice composto para nome + escola (facilita busca de homônimos)
CREATE INDEX IF NOT EXISTS idx_profiles_name_school 
ON public.profiles (name, current_school_id) 
WHERE is_active = true;

COMMENT ON INDEX idx_profiles_name_school IS 
'Índice composto para busca de alunos com nomes similares na mesma escola';

-- 2. Índice composto para matrícula + escola
CREATE INDEX IF NOT EXISTS idx_profiles_enrollment_school 
ON public.profiles (enrollment_number, current_school_id) 
WHERE enrollment_number IS NOT NULL AND current_school_id IS NOT NULL;

COMMENT ON INDEX idx_profiles_enrollment_school IS 
'Índice para busca rápida de matrícula por escola';

-- 3. Índice para telefone + escola
CREATE INDEX IF NOT EXISTS idx_profiles_phone_school 
ON public.profiles (phone, current_school_id) 
WHERE phone IS NOT NULL AND current_school_id IS NOT NULL;

COMMENT ON INDEX idx_profiles_phone_school IS 
'Índice para busca de telefones duplicados na mesma escola';

-- 4. Índice para DOB + escola (para busca de nome+DOB)
CREATE INDEX IF NOT EXISTS idx_profiles_dob_school 
ON public.profiles (dob, current_school_id) 
WHERE dob IS NOT NULL AND current_school_id IS NOT NULL;

COMMENT ON INDEX idx_profiles_dob_school IS 
'Índice para busca de alunos com mesma data de nascimento na mesma escola';
-- Corrigir perfis com current_school_id NULL usando school_memberships
-- Isso resolve o problema de usuários criados que não aparecem nas listas

UPDATE profiles p
SET current_school_id = sm.school_id
FROM school_memberships sm
WHERE p.id = sm.user_id
  AND p.current_school_id IS NULL
  AND sm.is_primary = true;

-- Comentário explicativo
COMMENT ON COLUMN profiles.current_school_id IS 
'ID da escola ativa do usuário. Deve ser preenchido na criação e sincronizado com school_memberships.';
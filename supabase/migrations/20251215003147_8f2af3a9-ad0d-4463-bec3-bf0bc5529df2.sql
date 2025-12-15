-- Limpar usuários órfãos existentes (exceto superadmin)
-- Identifica usuários sem nenhum school_membership que não são superadmin
DO $$
DECLARE
  orphan_record RECORD;
  deleted_count INT := 0;
BEGIN
  FOR orphan_record IN 
    SELECT p.id, p.name, p.email
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    LEFT JOIN school_memberships sm ON p.id = sm.user_id
    WHERE sm.user_id IS NULL
      AND ur.role != 'superadmin'
  LOOP
    RAISE NOTICE 'Deletando usuário órfão: % (%)', orphan_record.name, orphan_record.email;
    
    -- Deletar de auth.users (CASCADE cuida de profiles, user_roles, etc.)
    DELETE FROM auth.users WHERE id = orphan_record.id;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Total de usuários órfãos deletados: %', deleted_count;
END $$;
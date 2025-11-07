-- Migração: Vincular alunos existentes em turmas às suas escolas via school_memberships
-- Identificar alunos que estão em turmas mas não têm vínculo em school_memberships

INSERT INTO school_memberships (user_id, school_id, role, is_primary, created_at, updated_at)
SELECT DISTINCT 
  cs.student_id,
  c.school_id,
  'aluno',
  true,
  NOW(),
  NOW()
FROM class_students cs
JOIN classes c ON cs.class_id = c.id
WHERE c.school_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM school_memberships sm 
    WHERE sm.user_id = cs.student_id 
    AND sm.school_id = c.school_id
    AND sm.role = 'aluno'
  );
-- =====================================================
-- FIX: Multi-tenancy para import_history
-- Adiciona school_id e atualiza RLS policies
-- =====================================================

-- Adicionar coluna school_id
ALTER TABLE public.import_history 
ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Remover policies antigas (EXATAMENTE como estão nomeadas no banco)
DROP POLICY IF EXISTS "Administrador pode gerenciar histórico de importações" ON public.import_history;
DROP POLICY IF EXISTS "Secretaria pode gerenciar o histórico de importações" ON public.import_history;

-- Criar novas policies com filtro de escola usando user_has_school_access
CREATE POLICY "Administrador pode gerenciar histórico de importações" ON public.import_history
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND user_has_school_access(auth.uid(), school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role) 
  AND user_has_school_access(auth.uid(), school_id)
);

CREATE POLICY "Secretaria pode gerenciar histórico de importações" ON public.import_history
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND user_has_school_access(auth.uid(), school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'secretaria'::app_role) 
  AND user_has_school_access(auth.uid(), school_id)
);
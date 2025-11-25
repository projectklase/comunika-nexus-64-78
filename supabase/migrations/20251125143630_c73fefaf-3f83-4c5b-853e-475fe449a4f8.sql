-- =====================================================
-- MIGRATION: Sistema de Permissões Granulares para Secretárias
-- Objetivo: Permitir que admins concedam acesso controlado a múltiplas escolas
-- =====================================================

-- Criar tabela de permissões
CREATE TABLE IF NOT EXISTS public.secretaria_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secretaria_id UUID NOT NULL,
  permission_key TEXT NOT NULL,
  permission_value JSONB,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(secretaria_id, permission_key, school_id)
);

-- Comentários para documentação
COMMENT ON TABLE public.secretaria_permissions IS 'Permissões granulares para secretárias acessarem múltiplas escolas';
COMMENT ON COLUMN public.secretaria_permissions.permission_key IS 'Tipo de permissão: manage_all_schools, view_analytics, etc.';
COMMENT ON COLUMN public.secretaria_permissions.permission_value IS 'Valor JSON com configurações: {"schools": ["uuid1", "uuid2"]} ou {"schools": ["*"]}';
COMMENT ON COLUMN public.secretaria_permissions.school_id IS 'Escola que concedeu a permissão (para auditoria)';
COMMENT ON COLUMN public.secretaria_permissions.granted_by IS 'Admin que concedeu a permissão';

-- Habilitar RLS
ALTER TABLE public.secretaria_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Apenas administradores podem gerenciar permissões
CREATE POLICY "Administradores podem gerenciar permissões"
ON public.secretaria_permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- RLS Policy: Secretárias podem ver suas próprias permissões
CREATE POLICY "Secretárias podem ver suas permissões"
ON public.secretaria_permissions
FOR SELECT
TO authenticated
USING (secretaria_id = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_secretaria_permissions_secretaria_id 
ON public.secretaria_permissions(secretaria_id);

CREATE INDEX IF NOT EXISTS idx_secretaria_permissions_permission_key 
ON public.secretaria_permissions(permission_key);

CREATE INDEX IF NOT EXISTS idx_secretaria_permissions_school_id 
ON public.secretaria_permissions(school_id);
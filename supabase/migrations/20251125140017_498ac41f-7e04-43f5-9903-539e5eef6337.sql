-- Criar tabela de permissões extras para secretárias
CREATE TABLE public.secretaria_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secretaria_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  permission_value JSONB DEFAULT '{}',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  
  UNIQUE(secretaria_id, permission_key, school_id)
);

-- Índices para performance
CREATE INDEX idx_secretaria_permissions_secretaria_id ON public.secretaria_permissions(secretaria_id);
CREATE INDEX idx_secretaria_permissions_permission_key ON public.secretaria_permissions(permission_key);

-- Comentários para documentação
COMMENT ON TABLE public.secretaria_permissions IS 'Permissões extras concedidas pelo administrador para secretárias específicas';
COMMENT ON COLUMN public.secretaria_permissions.permission_key IS 'Chave da permissão (ex: manage_all_schools)';
COMMENT ON COLUMN public.secretaria_permissions.permission_value IS 'Valor JSONB extensível para configurações da permissão';

-- Enable RLS
ALTER TABLE public.secretaria_permissions ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar permissões
CREATE POLICY "Admins can manage all permissions" 
ON public.secretaria_permissions
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Secretárias podem ver suas próprias permissões
CREATE POLICY "Secretarias can view own permissions" 
ON public.secretaria_permissions
FOR SELECT
USING (secretaria_id = auth.uid());
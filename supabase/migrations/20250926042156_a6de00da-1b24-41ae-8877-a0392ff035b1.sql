-- Criar tabela de entregas
CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  class_id TEXT NOT NULL,
  
  -- Dados da entrega
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  
  -- Status de revisão
  review_status TEXT NOT NULL DEFAULT 'AGUARDANDO' CHECK (review_status IN ('AGUARDANDO', 'APROVADA', 'DEVOLVIDA')),
  review_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Flags calculadas
  is_late BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de anexos de entregas
CREATE TABLE public.delivery_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de notificações
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  meta JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para deliveries
CREATE POLICY "Estudantes podem criar suas próprias entregas" 
ON public.deliveries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Estudantes podem ver suas próprias entregas" 
ON public.deliveries 
FOR SELECT 
USING (true);

CREATE POLICY "Professores podem atualizar entregas (revisão)" 
ON public.deliveries 
FOR UPDATE 
USING (true);

-- Políticas RLS para delivery_attachments
CREATE POLICY "Usuários podem ver anexos de entregas" 
ON public.delivery_attachments 
FOR SELECT 
USING (true);

CREATE POLICY "Estudantes podem criar anexos para suas entregas" 
ON public.delivery_attachments 
FOR INSERT 
WITH CHECK (true);

-- Políticas RLS para notifications
CREATE POLICY "Usuários podem ver suas próprias notificações" 
ON public.notifications 
FOR SELECT 
USING (true);

CREATE POLICY "Sistema pode criar notificações" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar suas próprias notificações" 
ON public.notifications 
FOR UPDATE 
USING (true);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_deliveries_updated_at
BEFORE UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_deliveries_post_id ON public.deliveries(post_id);
CREATE INDEX idx_deliveries_student_id ON public.deliveries(student_id);
CREATE INDEX idx_deliveries_class_id ON public.deliveries(class_id);
CREATE INDEX idx_deliveries_review_status ON public.deliveries(review_status);
CREATE INDEX idx_delivery_attachments_delivery_id ON public.delivery_attachments(delivery_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Configurar realtime para receber atualizações em tempo real
ALTER TABLE public.deliveries REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
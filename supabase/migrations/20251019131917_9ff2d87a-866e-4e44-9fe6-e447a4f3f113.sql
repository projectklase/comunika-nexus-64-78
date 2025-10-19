-- FASE 1: Corrigir Schema do Banco (Foreign Keys e Índices)
-- Abordagem: criar FK sem validar dados antigos, depois limpar

-- 1.1 - Adicionar Foreign Key SEM validar dados existentes
ALTER TABLE public.koin_transactions
  ADD CONSTRAINT koin_transactions_related_entity_id_fkey
  FOREIGN KEY (related_entity_id)
  REFERENCES public.redemption_requests(id)
  ON DELETE SET NULL
  NOT VALID;

-- 1.2 - Limpar transações órfãs agora que a FK existe (mas não valida antigos)
UPDATE public.koin_transactions
SET related_entity_id = NULL
WHERE related_entity_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.redemption_requests 
    WHERE id = koin_transactions.related_entity_id
  );

-- 1.3 - Agora validar a FK (só valida novos dados)
ALTER TABLE public.koin_transactions
  VALIDATE CONSTRAINT koin_transactions_related_entity_id_fkey;

-- 1.4 - Criar índices de performance
CREATE INDEX IF NOT EXISTS idx_koin_tx_related_entity 
  ON public.koin_transactions(related_entity_id);

CREATE INDEX IF NOT EXISTS idx_koin_tx_user_created 
  ON public.koin_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_redemption_student_status 
  ON public.redemption_requests(student_id, status);

CREATE INDEX IF NOT EXISTS idx_redemption_item 
  ON public.redemption_requests(item_id);

-- 1.5 - Comentários para documentação
COMMENT ON CONSTRAINT koin_transactions_related_entity_id_fkey ON public.koin_transactions IS 
  'Relaciona transações de Koins com resgates de recompensas';

COMMENT ON INDEX idx_koin_tx_related_entity IS 
  'Melhora performance de queries que buscam transações relacionadas a resgates';

COMMENT ON INDEX idx_redemption_student_status IS 
  'Melhora performance de queries que filtram resgates por aluno e status';
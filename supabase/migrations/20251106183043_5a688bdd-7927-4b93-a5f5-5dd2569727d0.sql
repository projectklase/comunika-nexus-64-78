-- Índices para melhorar performance das queries de validação de capacidade de convites

-- Índice composto para contagem de convites por aluno em evento específico
CREATE INDEX IF NOT EXISTS idx_event_invitations_student_event 
ON event_invitations(inviting_student_id, event_id);

-- Índice para contagem rápida de confirmações por evento
CREATE INDEX IF NOT EXISTS idx_event_confirmations_event 
ON event_confirmations(event_id);

-- Índice parcial para filtrar eventos com capacidade habilitada
CREATE INDEX IF NOT EXISTS idx_posts_capacity_enabled 
ON posts(event_capacity_enabled) 
WHERE event_capacity_enabled = true;

-- Comentários explicativos
COMMENT ON INDEX idx_event_invitations_student_event IS 'Melhora performance da validação de limite PER_STUDENT';
COMMENT ON INDEX idx_event_confirmations_event IS 'Melhora performance da validação de limite GLOBAL';
COMMENT ON INDEX idx_posts_capacity_enabled IS 'Filtra rapidamente eventos com controle de capacidade';
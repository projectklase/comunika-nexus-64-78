-- Add event capacity control columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS event_capacity_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS event_capacity_type text CHECK (event_capacity_type IN ('GLOBAL', 'PER_STUDENT', null)),
ADD COLUMN IF NOT EXISTS event_max_participants integer CHECK (event_max_participants IS NULL OR event_max_participants > 0),
ADD COLUMN IF NOT EXISTS event_max_guests_per_student integer CHECK (event_max_guests_per_student IS NULL OR event_max_guests_per_student > 0);

COMMENT ON COLUMN posts.event_capacity_enabled IS 'Se o evento tem limite de participantes ativado';
COMMENT ON COLUMN posts.event_capacity_type IS 'GLOBAL: limite total de pessoas | PER_STUDENT: limite de convidados por aluno';
COMMENT ON COLUMN posts.event_max_participants IS 'Número máximo total de participantes (usado quando type = GLOBAL)';
COMMENT ON COLUMN posts.event_max_guests_per_student IS 'Número máximo de convidados por aluno (usado quando type = PER_STUDENT)';
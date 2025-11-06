-- ✅ Função de validação de capacidade para eventos
CREATE OR REPLACE FUNCTION validate_event_capacity()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  current_count INTEGER;
BEGIN
  -- Buscar configuração do evento
  SELECT 
    event_capacity_enabled, 
    event_capacity_type, 
    event_max_participants, 
    event_max_guests_per_student
  INTO event_record
  FROM posts
  WHERE id = NEW.event_id;

  -- Se não encontrou evento ou não tem limite habilitado, permitir
  IF NOT FOUND OR NOT event_record.event_capacity_enabled THEN
    RETURN NEW;
  END IF;

  -- Validar limite POR ALUNO
  IF event_record.event_capacity_type = 'PER_STUDENT' THEN
    SELECT COUNT(*) INTO current_count
    FROM event_invitations
    WHERE event_id = NEW.event_id 
      AND inviting_student_id = NEW.inviting_student_id;

    IF current_count >= event_record.event_max_guests_per_student THEN
      RAISE EXCEPTION 'Limite de convites por aluno atingido: você já convidou % amigo(s)', event_record.event_max_guests_per_student;
    END IF;
  END IF;

  -- Validar limite GLOBAL
  IF event_record.event_capacity_type = 'GLOBAL' THEN
    SELECT 
      COALESCE((SELECT COUNT(*) FROM event_confirmations WHERE event_id = NEW.event_id), 0) +
      COALESCE((SELECT COUNT(*) FROM event_invitations WHERE event_id = NEW.event_id), 0)
    INTO current_count;

    IF current_count >= event_record.event_max_participants THEN
      RAISE EXCEPTION 'Evento lotado: limite de % participantes atingido', event_record.event_max_participants;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ✅ Criar trigger para validar antes de inserir convites
DROP TRIGGER IF EXISTS validate_invitation_capacity ON event_invitations;
CREATE TRIGGER validate_invitation_capacity
  BEFORE INSERT ON event_invitations
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_capacity();
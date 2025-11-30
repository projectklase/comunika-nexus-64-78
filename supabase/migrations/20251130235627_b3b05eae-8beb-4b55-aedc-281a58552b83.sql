-- Create battle_queue table for matchmaking
CREATE TABLE IF NOT EXISTS battle_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'SEARCHING' CHECK (status IN ('SEARCHING', 'MATCHED', 'CANCELLED')),
  matched_with UUID REFERENCES profiles(id),
  battle_id UUID REFERENCES battles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE battle_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queue entry
CREATE POLICY "Users can view own queue entry"
  ON battle_queue FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own queue entry
CREATE POLICY "Users can insert own queue entry"
  ON battle_queue FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own queue entry
CREATE POLICY "Users can update own queue entry"
  ON battle_queue FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own queue entry
CREATE POLICY "Users can delete own queue entry"
  ON battle_queue FOR DELETE
  USING (user_id = auth.uid());

-- Create index for faster matchmaking queries
CREATE INDEX idx_battle_queue_school_status ON battle_queue(school_id, status) WHERE status = 'SEARCHING';

-- Enable realtime
ALTER TABLE battle_queue REPLICA IDENTITY FULL;

-- RPC: Join battle queue and find match
CREATE OR REPLACE FUNCTION join_battle_queue(
  p_user_id UUID,
  p_deck_id UUID,
  p_school_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_opponent_id UUID;
  v_opponent_deck_id UUID;
  v_battle_id UUID;
  v_queue_id UUID;
BEGIN
  -- Check if user already in queue
  DELETE FROM battle_queue WHERE user_id = p_user_id;

  -- Look for available opponent in same school
  SELECT user_id, deck_id INTO v_opponent_id, v_opponent_deck_id
  FROM battle_queue
  WHERE school_id = p_school_id
    AND status = 'SEARCHING'
    AND user_id != p_user_id
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If opponent found, create battle
  IF v_opponent_id IS NOT NULL THEN
    -- Create battle
    INSERT INTO battles (
      player1_id,
      player1_deck_id,
      player2_id,
      player2_deck_id,
      status,
      current_turn
    ) VALUES (
      v_opponent_id,
      v_opponent_deck_id,
      p_user_id,
      p_deck_id,
      'WAITING',
      'PLAYER1'
    ) RETURNING id INTO v_battle_id;

    -- Update opponent's queue entry
    UPDATE battle_queue
    SET status = 'MATCHED',
        matched_with = p_user_id,
        battle_id = v_battle_id,
        updated_at = now()
    WHERE user_id = v_opponent_id;

    -- Insert current user's queue entry as matched
    INSERT INTO battle_queue (user_id, deck_id, school_id, status, matched_with, battle_id)
    VALUES (p_user_id, p_deck_id, p_school_id, 'MATCHED', v_opponent_id, v_battle_id);

    RETURN jsonb_build_object(
      'status', 'MATCHED',
      'battle_id', v_battle_id,
      'opponent_id', v_opponent_id
    );
  ELSE
    -- No opponent found, add to queue
    INSERT INTO battle_queue (user_id, deck_id, school_id, status)
    VALUES (p_user_id, p_deck_id, p_school_id, 'SEARCHING')
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object(
      'status', 'SEARCHING',
      'queue_id', v_queue_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Leave battle queue
CREATE OR REPLACE FUNCTION leave_battle_queue(p_user_id UUID) RETURNS VOID AS $$
BEGIN
  DELETE FROM battle_queue WHERE user_id = p_user_id AND status = 'SEARCHING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get queue position
CREATE OR REPLACE FUNCTION get_queue_position(p_user_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_position INTEGER;
  v_school_id UUID;
BEGIN
  SELECT school_id INTO v_school_id FROM battle_queue WHERE user_id = p_user_id;
  
  IF v_school_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) + 1 INTO v_position
  FROM battle_queue
  WHERE school_id = v_school_id
    AND status = 'SEARCHING'
    AND created_at < (SELECT created_at FROM battle_queue WHERE user_id = p_user_id);

  RETURN COALESCE(v_position, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
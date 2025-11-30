-- Tabela de batalhas
CREATE TABLE public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player1_deck_id UUID NOT NULL REFERENCES decks(id),
  player2_deck_id UUID NOT NULL REFERENCES decks(id),
  
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'IN_PROGRESS', 'FINISHED', 'ABANDONED')),
  current_turn TEXT CHECK (current_turn IN ('PLAYER1', 'PLAYER2')),
  current_round INTEGER DEFAULT 1,
  
  rounds_data JSONB DEFAULT '[]',
  
  player1_rounds_won INTEGER DEFAULT 0,
  player2_rounds_won INTEGER DEFAULT 0,
  winner_id UUID REFERENCES profiles(id),
  
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_action_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_battles_player1 ON battles(player1_id);
CREATE INDEX idx_battles_player2 ON battles(player2_id);
CREATE INDEX idx_battles_status ON battles(status);
CREATE INDEX idx_battles_winner ON battles(winner_id);

ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own battles" ON battles
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Players can create battles" ON battles
  FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Players can update their battles" ON battles
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE OR REPLACE FUNCTION public.play_battle_turn(
  p_battle_id UUID,
  p_player_id UUID,
  p_line INTEGER,
  p_card_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_battle RECORD;
  v_card RECORD;
  v_current_player TEXT;
  v_rounds_data JSONB;
  v_current_round JSONB;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id FOR UPDATE;
  IF v_battle IS NULL THEN RAISE EXCEPTION 'Batalha não encontrada'; END IF;
  IF v_battle.status != 'IN_PROGRESS' THEN RAISE EXCEPTION 'Batalha não está em progresso'; END IF;
  
  IF p_player_id = v_battle.player1_id THEN v_current_player := 'PLAYER1';
  ELSIF p_player_id = v_battle.player2_id THEN v_current_player := 'PLAYER2';
  ELSE RAISE EXCEPTION 'Jogador não participa desta batalha'; END IF;
  
  IF v_battle.current_turn != v_current_player THEN RAISE EXCEPTION 'Não é seu turno'; END IF;
  
  SELECT c.* INTO v_card FROM cards c INNER JOIN user_cards uc ON uc.card_id = c.id WHERE c.id = p_card_id AND uc.user_id = p_player_id;
  IF v_card IS NULL THEN RAISE EXCEPTION 'Carta não encontrada'; END IF;
  
  v_rounds_data := COALESCE(v_battle.rounds_data, '[]'::jsonb);
  IF jsonb_array_length(v_rounds_data) < v_battle.current_round THEN
    v_current_round := jsonb_build_object('round', v_battle.current_round, 'player1_cards', jsonb_build_object('line1', '[]'::jsonb, 'line2', '[]'::jsonb, 'line3', '[]'::jsonb), 'player2_cards', jsonb_build_object('line1', '[]'::jsonb, 'line2', '[]'::jsonb, 'line3', '[]'::jsonb), 'player1_score', 0, 'player2_score', 0);
    v_rounds_data := v_rounds_data || v_current_round;
  ELSE
    v_current_round := v_rounds_data->((v_battle.current_round - 1)::int);
  END IF;
  
  IF v_current_player = 'PLAYER1' THEN
    v_current_round := jsonb_set(v_current_round, ARRAY['player1_cards', 'line' || p_line::text], (v_current_round->'player1_cards'->('line' || p_line::text)) || jsonb_build_object('id', v_card.id, 'atk', v_card.atk, 'def', v_card.def, 'name', v_card.name));
  ELSE
    v_current_round := jsonb_set(v_current_round, ARRAY['player2_cards', 'line' || p_line::text], (v_current_round->'player2_cards'->('line' || p_line::text)) || jsonb_build_object('id', v_card.id, 'atk', v_card.atk, 'def', v_card.def, 'name', v_card.name));
  END IF;
  
  v_rounds_data := jsonb_set(v_rounds_data, ARRAY[(v_battle.current_round - 1)::text], v_current_round);
  UPDATE battles SET rounds_data = v_rounds_data, current_turn = CASE WHEN current_turn = 'PLAYER1' THEN 'PLAYER2' ELSE 'PLAYER1' END, last_action_at = now(), updated_at = now() WHERE id = p_battle_id;
  
  RETURN jsonb_build_object('success', true, 'current_round', v_current_round);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_battle_round(p_battle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_battle RECORD;
  v_rounds_data JSONB;
  v_current_round JSONB;
  v_player1_total INT := 0;
  v_player2_total INT := 0;
  v_round_winner TEXT;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id FOR UPDATE;
  v_rounds_data := v_battle.rounds_data;
  v_current_round := v_rounds_data->((v_battle.current_round - 1)::int);
  
  FOR i IN 1..3 LOOP
    FOR j IN 0..(jsonb_array_length(v_current_round->'player1_cards'->('line' || i::text)) - 1) LOOP
      v_player1_total := v_player1_total + ((v_current_round->'player1_cards'->('line' || i::text)->j)->>'atk')::int;
    END LOOP;
    FOR j IN 0..(jsonb_array_length(v_current_round->'player2_cards'->('line' || i::text)) - 1) LOOP
      v_player2_total := v_player2_total + ((v_current_round->'player2_cards'->('line' || i::text)->j)->>'atk')::int;
    END LOOP;
  END LOOP;
  
  v_current_round := jsonb_set(v_current_round, ARRAY['player1_score'], to_jsonb(v_player1_total));
  v_current_round := jsonb_set(v_current_round, ARRAY['player2_score'], to_jsonb(v_player2_total));
  v_rounds_data := jsonb_set(v_rounds_data, ARRAY[(v_battle.current_round - 1)::text], v_current_round);
  
  IF v_player1_total > v_player2_total THEN
    v_round_winner := 'PLAYER1';
    UPDATE battles SET player1_rounds_won = player1_rounds_won + 1 WHERE id = p_battle_id;
  ELSIF v_player2_total > v_player1_total THEN
    v_round_winner := 'PLAYER2';
    UPDATE battles SET player2_rounds_won = player2_rounds_won + 1 WHERE id = p_battle_id;
  ELSE
    v_round_winner := 'DRAW';
  END IF;
  
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF v_battle.player1_rounds_won >= 2 THEN
    UPDATE battles SET status = 'FINISHED', winner_id = v_battle.player1_id, finished_at = now(), rounds_data = v_rounds_data WHERE id = p_battle_id;
    RETURN jsonb_build_object('battle_finished', true, 'winner', 'PLAYER1', 'round_winner', v_round_winner, 'player1_score', v_player1_total, 'player2_score', v_player2_total);
  ELSIF v_battle.player2_rounds_won >= 2 THEN
    UPDATE battles SET status = 'FINISHED', winner_id = v_battle.player2_id, finished_at = now(), rounds_data = v_rounds_data WHERE id = p_battle_id;
    RETURN jsonb_build_object('battle_finished', true, 'winner', 'PLAYER2', 'round_winner', v_round_winner, 'player1_score', v_player1_total, 'player2_score', v_player2_total);
  ELSE
    UPDATE battles SET current_round = current_round + 1, current_turn = 'PLAYER1', rounds_data = v_rounds_data WHERE id = p_battle_id;
    RETURN jsonb_build_object('battle_finished', false, 'next_round', v_battle.current_round + 1, 'round_winner', v_round_winner, 'player1_score', v_player1_total, 'player2_score', v_player2_total);
  END IF;
END;
$$;
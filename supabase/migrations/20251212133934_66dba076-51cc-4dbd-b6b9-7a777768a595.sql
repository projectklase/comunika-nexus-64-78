-- 1. Criar tabela para log de XP semanal
CREATE TABLE public.weekly_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  xp_earned INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'battle_win', 'battle_loss', 'challenge', 'weekly_prize', 'checkin'
  earned_at TIMESTAMPTZ DEFAULT now(),
  week_start DATE NOT NULL -- Segunda-feira da semana
);

-- Índices para performance
CREATE INDEX idx_weekly_xp_week ON weekly_xp_log(school_id, week_start);
CREATE INDEX idx_weekly_xp_user_week ON weekly_xp_log(user_id, week_start);

-- RLS
ALTER TABLE weekly_xp_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view weekly XP from their school"
ON weekly_xp_log FOR SELECT
USING (user_has_school_access(auth.uid(), school_id));

CREATE POLICY "System can insert weekly XP logs"
ON weekly_xp_log FOR INSERT
WITH CHECK (true);

-- 2. Função para obter início da semana (segunda-feira)
CREATE OR REPLACE FUNCTION get_week_start(p_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_date - EXTRACT(ISODOW FROM p_date)::INTEGER + 1)::DATE;
$$;

-- 3. RPC para obter rankings semanais
CREATE OR REPLACE FUNCTION get_weekly_xp_rankings(
  school_id_param UUID,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  avatar TEXT,
  weekly_xp BIGINT,
  rank_position BIGINT,
  equipped_avatar_emoji TEXT,
  equipped_avatar_rarity TEXT,
  equipped_avatar_image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
BEGIN
  -- Obter segunda-feira da semana atual
  v_week_start := get_week_start(CURRENT_DATE);
  
  RETURN QUERY
  WITH weekly_totals AS (
    SELECT 
      wl.user_id,
      SUM(wl.xp_earned) as total_xp
    FROM weekly_xp_log wl
    WHERE wl.school_id = school_id_param
      AND wl.week_start = v_week_start
      AND wl.source != 'weekly_prize' -- Não contar prêmios no ranking
    GROUP BY wl.user_id
  ),
  ranked AS (
    SELECT 
      wt.user_id,
      wt.total_xp,
      ROW_NUMBER() OVER (ORDER BY wt.total_xp DESC) as rank_pos
    FROM weekly_totals wt
  ),
  user_avatars AS (
    SELECT 
      uu.user_id,
      u.identifier as emoji,
      u.rarity,
      (u.preview_data->>'image_url')::TEXT as image_url
    FROM user_unlocks uu
    JOIN unlockables u ON u.id = uu.unlockable_id
    WHERE uu.is_equipped = true AND u.type = 'AVATAR'
  )
  SELECT 
    r.user_id as student_id,
    p.name as student_name,
    p.avatar,
    r.total_xp as weekly_xp,
    r.rank_pos as rank_position,
    ua.emoji as equipped_avatar_emoji,
    ua.rarity as equipped_avatar_rarity,
    ua.image_url as equipped_avatar_image_url
  FROM ranked r
  JOIN profiles p ON p.id = r.user_id
  LEFT JOIN user_avatars ua ON ua.user_id = r.user_id
  ORDER BY r.rank_pos
  LIMIT limit_count;
END;
$$;

-- 4. RPC para processar prêmios semanais (chamado pelo CRON domingo 23:59)
CREATE OR REPLACE FUNCTION process_weekly_xp_prizes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prizes INTEGER[] := ARRAY[800, 500, 350, 100, 50, 25, 25, 25, 25, 25];
  v_school RECORD;
  v_student RECORD;
  v_rank INTEGER;
  v_prize INTEGER;
  v_week_start DATE;
  v_count INTEGER := 0;
BEGIN
  -- Semana que está terminando (segunda-feira passada)
  v_week_start := get_week_start(CURRENT_DATE);
  
  -- Para cada escola com atividade na semana
  FOR v_school IN 
    SELECT DISTINCT school_id 
    FROM weekly_xp_log 
    WHERE week_start = v_week_start 
      AND source != 'weekly_prize'
  LOOP
    v_rank := 0;
    
    -- Top 10 da escola
    FOR v_student IN 
      SELECT 
        user_id, 
        SUM(xp_earned) as total_weekly_xp
      FROM weekly_xp_log
      WHERE school_id = v_school.school_id 
        AND week_start = v_week_start
        AND source != 'weekly_prize'
      GROUP BY user_id
      ORDER BY total_weekly_xp DESC
      LIMIT 10
    LOOP
      v_rank := v_rank + 1;
      v_prize := v_prizes[v_rank];
      
      -- Dar prêmio (só total_xp gastável, NÃO level_xp)
      UPDATE profiles 
      SET total_xp = COALESCE(total_xp, 0) + v_prize 
      WHERE id = v_student.user_id;
      
      -- Logar prêmio para histórico
      INSERT INTO weekly_xp_log (user_id, school_id, xp_earned, source, week_start)
      VALUES (v_student.user_id, v_school.school_id, v_prize, 'weekly_prize', v_week_start);
      
      -- Criar notificação para o aluno
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_student.user_id,
        'WEEKLY_PRIZE',
        '🏆 Prêmio Semanal!',
        'Parabéns! Você ficou em ' || v_rank || 'º lugar no Top XP Semanal e ganhou ' || v_prize || ' XP de bônus!',
        '/aluno/perfil'
      );
      
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- 5. Atualizar execute_battle_turn para logar XP semanal
CREATE OR REPLACE FUNCTION public.execute_battle_turn(p_battle_id uuid, p_player_id uuid, p_action text, p_card_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_battle battles%ROWTYPE;
  v_game_state JSONB;
  v_current_turn TEXT;
  v_player_key TEXT;
  v_opponent_key TEXT;
  v_opponent_id UUID;
  v_result JSONB;
  v_action_log JSONB;
  v_winner_id UUID;
  v_loser_id UUID;
  v_is_player1 BOOLEAN;
  v_played_card JSONB;
  v_damage INTEGER;
  v_damage_result JSONB;
  v_attacker_stats JSONB;
  v_defender_stats JSONB;
  v_attacker_card JSONB;
  v_defender_card JSONB;
  v_is_counter_attack BOOLEAN := FALSE;
  v_player_field JSONB;
  v_opponent_field JSONB;
  v_player_hp INTEGER;
  v_opponent_hp INTEGER;
  v_card_index INTEGER;
  v_player_hand JSONB;
  v_updated_hand JSONB;
  v_first_occurrence INTEGER := -1;
  v_i INTEGER;
  v_player_school_id UUID;
  v_week_start DATE;
BEGIN
  -- Obter início da semana
  v_week_start := get_week_start(CURRENT_DATE);

  -- Buscar batalha e validar
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não encontrada');
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batalha não está em progresso');
  END IF;
  
  -- Determinar se é player1 ou player2
  v_is_player1 := (p_player_id = v_battle.player1_id);
  
  IF NOT v_is_player1 AND p_player_id != v_battle.player2_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não é participante desta batalha');
  END IF;
  
  v_game_state := v_battle.game_state;
  v_current_turn := v_game_state->>'current_turn';
  
  -- Validar turno
  IF v_current_turn IS NOT NULL AND v_current_turn != p_player_id::TEXT THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não é seu turno');
  END IF;
  
  -- Definir chaves
  IF v_is_player1 THEN
    v_player_key := 'player1';
    v_opponent_key := 'player2';
    v_opponent_id := v_battle.player2_id;
  ELSE
    v_player_key := 'player2';
    v_opponent_key := 'player1';
    v_opponent_id := v_battle.player1_id;
  END IF;
  
  v_player_field := v_game_state->(v_player_key || '_field');
  v_opponent_field := v_game_state->(v_opponent_key || '_field');
  v_player_hp := (v_game_state->(v_player_key || '_hp'))::INTEGER;
  v_opponent_hp := (v_game_state->(v_opponent_key || '_hp'))::INTEGER;
  v_player_hand := v_game_state->(v_player_key || '_hand');
  
  -- Processar ação
  CASE p_action
    WHEN 'PLAY_CARD' THEN
      IF p_card_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Card ID necessário');
      END IF;
      
      -- Encontrar APENAS a primeira ocorrência da carta na mão
      v_first_occurrence := -1;
      FOR v_i IN 0..jsonb_array_length(v_player_hand) - 1 LOOP
        IF (v_player_hand->v_i->>'id')::UUID = p_card_id THEN
          v_first_occurrence := v_i;
          EXIT;
        END IF;
      END LOOP;
      
      IF v_first_occurrence = -1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Carta não encontrada na mão');
      END IF;
      
      v_played_card := v_player_hand->v_first_occurrence;
      
      v_updated_hand := '[]'::JSONB;
      FOR v_i IN 0..jsonb_array_length(v_player_hand) - 1 LOOP
        IF v_i != v_first_occurrence THEN
          v_updated_hand := v_updated_hand || jsonb_build_array(v_player_hand->v_i);
        END IF;
      END LOOP;
      
      v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hand'], v_updated_hand);
      v_player_field := jsonb_set(COALESCE(v_player_field, '{"monster": null, "traps": []}'::JSONB), '{monster}', v_played_card);
      v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_field'], v_player_field);
      
      v_action_log := jsonb_build_object(
        'action', 'PLAY_CARD',
        'player', p_player_id,
        'card', v_played_card,
        'timestamp', now()
      );
      
    WHEN 'ATTACK' THEN
      IF v_player_field->'monster' IS NULL OR v_player_field->>'monster' = 'null' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você não tem monstro no campo');
      END IF;
      
      v_attacker_card := v_player_field->'monster';
      v_defender_card := v_opponent_field->'monster';
      
      v_damage_result := calculate_damage_and_apply_effects(
        v_attacker_card,
        v_defender_card,
        v_player_hp,
        v_opponent_hp
      );
      
      v_damage := (v_damage_result->>'damage')::INTEGER;
      v_attacker_stats := v_damage_result->'attacker_stats';
      v_defender_stats := v_damage_result->'defender_stats';
      v_is_counter_attack := COALESCE((v_damage_result->>'is_counter_attack')::BOOLEAN, FALSE);
      
      IF v_damage_result->'attacker_hp_change' IS NOT NULL THEN
        v_player_hp := GREATEST(0, v_player_hp + (v_damage_result->>'attacker_hp_change')::INTEGER);
      END IF;
      
      IF v_is_counter_attack THEN
        v_player_hp := GREATEST(0, v_player_hp - v_damage);
      ELSE
        v_opponent_hp := GREATEST(0, v_opponent_hp - v_damage);
      END IF;
      
      v_game_state := jsonb_set(v_game_state, ARRAY[v_player_key || '_hp'], to_jsonb(v_player_hp));
      v_game_state := jsonb_set(v_game_state, ARRAY[v_opponent_key || '_hp'], to_jsonb(v_opponent_hp));
      
      v_action_log := jsonb_build_object(
        'action', 'ATTACK',
        'player', p_player_id,
        'attacker', v_attacker_card,
        'defender', v_defender_card,
        'damage', v_damage,
        'attacker_stats', v_attacker_stats,
        'defender_stats', v_defender_stats,
        'effects_applied', v_damage_result->'effects_applied',
        'is_counter_attack', v_is_counter_attack,
        'player_hp_after', v_player_hp,
        'opponent_hp_after', v_opponent_hp,
        'timestamp', now()
      );
      
    WHEN 'END_TURN' THEN
      v_action_log := jsonb_build_object(
        'action', 'END_TURN',
        'player', p_player_id,
        'timestamp', now()
      );
      
    WHEN 'SURRENDER' THEN
      v_winner_id := v_opponent_id;
      v_loser_id := p_player_id;
      
      -- Obter school_id do vencedor
      SELECT current_school_id INTO v_player_school_id FROM profiles WHERE id = v_winner_id;
      
      UPDATE battles
      SET status = 'FINISHED',
          winner_id = v_winner_id,
          finished_at = now(),
          game_state = jsonb_set(v_game_state, '{battle_log}', 
            COALESCE(v_game_state->'battle_log', '[]'::JSONB) || 
            jsonb_build_array(jsonb_build_object(
              'action', 'SURRENDER',
              'player', p_player_id,
              'winner', v_winner_id,
              'timestamp', now()
            ))
          )
      WHERE id = p_battle_id;
      
      -- Dar XP ao vencedor
      UPDATE profiles 
      SET total_xp = COALESCE(total_xp, 0) + 50,
          level_xp = COALESCE(level_xp, 0) + 50
      WHERE id = v_winner_id;
      
      -- Logar XP semanal do vencedor
      IF v_player_school_id IS NOT NULL THEN
        INSERT INTO weekly_xp_log (user_id, school_id, xp_earned, source, week_start)
        VALUES (v_winner_id, v_player_school_id, 50, 'battle_win', v_week_start);
      END IF;
      
      RETURN jsonb_build_object(
        'success', true,
        'battle_ended', true,
        'winner_id', v_winner_id,
        'reason', 'surrender'
      );
      
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Ação inválida');
  END CASE;
  
  -- Verificar vitória por HP
  IF v_opponent_hp <= 0 THEN
    v_winner_id := p_player_id;
    v_loser_id := v_opponent_id;
  ELSIF v_player_hp <= 0 THEN
    v_winner_id := v_opponent_id;
    v_loser_id := p_player_id;
  END IF;
  
  -- Adicionar log
  v_game_state := jsonb_set(
    v_game_state, 
    '{battle_log}', 
    COALESCE(v_game_state->'battle_log', '[]'::JSONB) || jsonb_build_array(v_action_log)
  );
  
  -- Alternar turno se não houver vencedor
  IF v_winner_id IS NULL AND p_action IN ('END_TURN', 'ATTACK', 'PLAY_CARD') THEN
    v_game_state := jsonb_set(v_game_state, '{current_turn}', to_jsonb(v_opponent_id::TEXT));
  END IF;
  
  -- Atualizar batalha
  IF v_winner_id IS NOT NULL THEN
    -- Obter school_id do vencedor
    SELECT current_school_id INTO v_player_school_id FROM profiles WHERE id = v_winner_id;
    
    UPDATE battles
    SET status = 'FINISHED',
        winner_id = v_winner_id,
        finished_at = now(),
        game_state = v_game_state,
        last_action_at = now()
    WHERE id = p_battle_id;
    
    -- Dar XP ao vencedor
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 100,
        level_xp = COALESCE(level_xp, 0) + 100
    WHERE id = v_winner_id;
    
    -- Logar XP semanal do vencedor
    IF v_player_school_id IS NOT NULL THEN
      INSERT INTO weekly_xp_log (user_id, school_id, xp_earned, source, week_start)
      VALUES (v_winner_id, v_player_school_id, 100, 'battle_win', v_week_start);
    END IF;
    
    -- Dar XP de consolação ao perdedor
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 25,
        level_xp = COALESCE(level_xp, 0) + 25
    WHERE id = v_loser_id;
    
    -- Logar XP semanal do perdedor
    SELECT current_school_id INTO v_player_school_id FROM profiles WHERE id = v_loser_id;
    IF v_player_school_id IS NOT NULL THEN
      INSERT INTO weekly_xp_log (user_id, school_id, xp_earned, source, week_start)
      VALUES (v_loser_id, v_player_school_id, 25, 'battle_loss', v_week_start);
    END IF;
  ELSE
    UPDATE battles
    SET game_state = v_game_state,
        last_action_at = now(),
        turn_started_at = CASE WHEN p_action = 'END_TURN' THEN now() ELSE turn_started_at END
    WHERE id = p_battle_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'game_state', v_game_state,
    'action_log', v_action_log,
    'battle_ended', v_winner_id IS NOT NULL,
    'winner_id', v_winner_id
  );
END;
$function$;

-- 6. Atualizar complete_challenge_and_reward para logar XP semanal
CREATE OR REPLACE FUNCTION public.complete_challenge_and_reward(p_student_id uuid, p_challenge_id uuid, p_koin_reward integer, p_xp_reward integer DEFAULT 0)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_school_id UUID;
  v_current_balance INTEGER;
  v_week_start DATE;
BEGIN
  -- Obter início da semana
  v_week_start := get_week_start(CURRENT_DATE);

  -- Obter school_id do aluno
  SELECT current_school_id INTO v_school_id
  FROM profiles
  WHERE id = p_student_id;

  -- Obter saldo atual
  SELECT koins INTO v_current_balance
  FROM profiles
  WHERE id = p_student_id;

  -- Atualizar status do desafio
  UPDATE student_challenges
  SET status = 'COMPLETED',
      completed_at = now(),
      updated_at = now()
  WHERE student_id = p_student_id
    AND challenge_id = p_challenge_id;

  -- Atualizar saldo do aluno e XP (ambos os campos de XP)
  UPDATE profiles
  SET koins = koins + p_koin_reward,
      total_xp = COALESCE(total_xp, 0) + p_xp_reward,
      level_xp = COALESCE(level_xp, 0) + p_xp_reward
  WHERE id = p_student_id;

  -- Logar XP semanal
  IF v_school_id IS NOT NULL AND p_xp_reward > 0 THEN
    INSERT INTO weekly_xp_log (user_id, school_id, xp_earned, source, week_start)
    VALUES (p_student_id, v_school_id, p_xp_reward, 'challenge', v_week_start);
  END IF;

  -- Registrar transação de Koins
  INSERT INTO koin_transactions (
    user_id,
    type,
    amount,
    description,
    related_entity_id,
    balance_before,
    balance_after,
    school_id
  ) VALUES (
    p_student_id,
    'CHALLENGE_REWARD',
    p_koin_reward,
    'Recompensa por completar desafio',
    p_challenge_id,
    v_current_balance,
    v_current_balance + p_koin_reward,
    v_school_id
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao completar desafio: %', SQLERRM;
    RETURN FALSE;
END;
$function$;
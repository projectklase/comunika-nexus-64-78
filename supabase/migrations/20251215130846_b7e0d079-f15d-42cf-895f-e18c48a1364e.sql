-- ============================================================
-- MIGRAÇÃO DEFINITIVA: Restauração completa de open_card_pack e attack
-- ============================================================

-- 1. DROP todas as versões conflitantes de open_card_pack
DROP FUNCTION IF EXISTS public.open_card_pack(text, boolean);
DROP FUNCTION IF EXISTS public.open_card_pack(uuid, text);
DROP FUNCTION IF EXISTS public.open_card_pack(uuid, text, boolean);

-- 2. DROP todas as versões de attack
DROP FUNCTION IF EXISTS public.attack(uuid, uuid);

-- ============================================================
-- 3. RECRIAR open_card_pack - EXATAMENTE como 20251208231031
-- ============================================================
CREATE OR REPLACE FUNCTION public.open_card_pack(p_user_id uuid, p_pack_type text, p_is_free boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_xp_cost INTEGER;
  v_pack_size INTEGER;
  v_user_xp INTEGER;
  v_user_level INTEGER;
  v_cards_received JSONB := '[]'::jsonb;
  v_card RECORD;
  v_rarity TEXT;
  v_random FLOAT;
  v_common_prob FLOAT;
  v_rare_prob FLOAT;
  v_epic_prob FLOAT;
  v_legendary_prob FLOAT;
  v_limited_prob FLOAT;
  v_has_active_event BOOLEAN;
  v_is_event_pack BOOLEAN := false;
BEGIN
  -- Check if there's an active event
  SELECT EXISTS(
    SELECT 1 FROM card_events 
    WHERE is_active = true 
    AND NOW() BETWEEN starts_at AND ends_at
  ) INTO v_has_active_event;

  -- Define pack costs, sizes and probabilities
  CASE p_pack_type
    WHEN 'BASIC' THEN
      v_xp_cost := 100;
      v_pack_size := 3;
      v_common_prob := 0.85;
      v_rare_prob := 0.13;
      v_epic_prob := 0.019;
      v_legendary_prob := 0.001;
      v_limited_prob := CASE WHEN v_has_active_event THEN 0.05 ELSE 0 END;
    WHEN 'RARE' THEN
      v_xp_cost := 500;
      v_pack_size := 5;
      v_common_prob := 0.60;
      v_rare_prob := 0.35;
      v_epic_prob := 0.045;
      v_legendary_prob := 0.005;
      v_limited_prob := CASE WHEN v_has_active_event THEN 0.08 ELSE 0 END;
    WHEN 'EPIC' THEN
      v_xp_cost := 1500;
      v_pack_size := 5;
      v_common_prob := 0.40;
      v_rare_prob := 0.45;
      v_epic_prob := 0.14;
      v_legendary_prob := 0.01;
      v_limited_prob := CASE WHEN v_has_active_event THEN 0.12 ELSE 0 END;
    WHEN 'LEGENDARY' THEN
      v_xp_cost := 5000;
      v_pack_size := 7;
      v_common_prob := 0.25;
      v_rare_prob := 0.45;
      v_epic_prob := 0.25;
      v_legendary_prob := 0.05;
      v_limited_prob := CASE WHEN v_has_active_event THEN 0.15 ELSE 0 END;
    WHEN 'EVENT' THEN
      -- Special event pack: 8000 XP, 1 card, 100% event card
      IF NOT v_has_active_event THEN
        RAISE EXCEPTION 'Nenhum evento ativo no momento';
      END IF;
      v_xp_cost := 8000;
      v_pack_size := 1;
      v_limited_prob := 1.0; -- 100% guaranteed
      v_is_event_pack := true;
    ELSE
      RAISE EXCEPTION 'Invalid pack type: %', p_pack_type;
  END CASE;

  -- Get user's current XP and level
  SELECT total_xp INTO v_user_xp
  FROM profiles
  WHERE id = p_user_id;

  -- Only deduct XP if not free
  IF NOT p_is_free THEN
    IF v_user_xp < v_xp_cost THEN
      RAISE EXCEPTION 'XP insuficiente. Necessário: %, Disponível: %', v_xp_cost, v_user_xp;
    END IF;

    UPDATE profiles
    SET total_xp = total_xp - v_xp_cost,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Calculate user level
  v_user_level := FLOOR(v_user_xp / 100);

  -- Generate cards based on rarity probabilities
  FOR i IN 1..v_pack_size LOOP
    v_random := random();
    
    -- EVENT pack: 100% event card
    IF v_is_event_pack THEN
      SELECT c.* INTO v_card
      FROM cards c
      INNER JOIN card_events ce ON c.event_id = ce.id
      WHERE c.is_active = TRUE
        AND ce.is_active = true
        AND NOW() BETWEEN ce.starts_at AND ce.ends_at
      ORDER BY random()
      LIMIT 1;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Nenhuma carta de evento disponível';
      END IF;
    ELSE
      -- Normal pack logic
      -- First check if we should get a LIMITED_EDITION card (during events)
      IF v_has_active_event AND v_random < v_limited_prob THEN
        v_rarity := 'LIMITED_EDITION';
      ELSIF v_random < v_common_prob THEN
        v_rarity := 'COMMON';
      ELSIF v_random < (v_common_prob + v_rare_prob) THEN
        v_rarity := 'RARE';
      ELSIF v_random < (v_common_prob + v_rare_prob + v_epic_prob) THEN
        v_rarity := 'EPIC';
      ELSE
        v_rarity := 'LEGENDARY';
      END IF;

      -- Select a card based on rarity
      IF v_rarity = 'LIMITED_EDITION' THEN
        -- Select from event cards only
        SELECT c.* INTO v_card
        FROM cards c
        INNER JOIN card_events ce ON c.event_id = ce.id
        WHERE c.is_active = TRUE
          AND c.required_level <= v_user_level
          AND ce.is_active = true
          AND NOW() BETWEEN ce.starts_at AND ce.ends_at
        ORDER BY random()
        LIMIT 1;
        
        -- Fallback to EPIC if no event card found
        IF NOT FOUND THEN
          v_rarity := 'EPIC';
        END IF;
      END IF;
      
      -- Select normal cards (non-event)
      IF v_rarity != 'LIMITED_EDITION' OR NOT FOUND THEN
        SELECT * INTO v_card
        FROM cards
        WHERE rarity = v_rarity
          AND is_active = TRUE
          AND required_level <= v_user_level
          AND event_id IS NULL  -- Only non-event cards
        ORDER BY random()
        LIMIT 1;
      END IF;

      -- If no card found (user level too low), try COMMON
      IF NOT FOUND THEN
        SELECT * INTO v_card
        FROM cards
        WHERE rarity = 'COMMON'
          AND is_active = TRUE
          AND required_level <= v_user_level
          AND event_id IS NULL
        ORDER BY random()
        LIMIT 1;
      END IF;
    END IF;

    -- Add card to user's collection
    IF FOUND THEN
      INSERT INTO user_cards (user_id, card_id, quantity, unlock_source)
      VALUES (p_user_id, v_card.id, 1, 'PACK')
      ON CONFLICT (user_id, card_id)
      DO UPDATE SET quantity = user_cards.quantity + 1;

      -- Add to result array
      v_cards_received := v_cards_received || jsonb_build_object(
        'id', v_card.id,
        'name', v_card.name,
        'rarity', CASE WHEN v_card.event_id IS NOT NULL THEN 'LIMITED_EDITION' ELSE v_card.rarity END,
        'category', v_card.category,
        'atk', v_card.atk,
        'def', v_card.def,
        'effects', v_card.effects,
        'image_url', v_card.image_url,
        'event_id', v_card.event_id
      );
    END IF;
  END LOOP;

  -- Log pack opening
  INSERT INTO card_packs (user_id, pack_type, cards_received, xp_cost)
  VALUES (
    p_user_id, 
    p_pack_type, 
    (SELECT array_agg((card->>'id')::uuid) FROM jsonb_array_elements(v_cards_received) card),
    CASE WHEN p_is_free THEN 0 ELSE v_xp_cost END
  );

  -- Return result
  RETURN jsonb_build_object(
    'success', TRUE,
    'pack_type', p_pack_type,
    'xp_spent', CASE WHEN p_is_free THEN 0 ELSE v_xp_cost END,
    'cards_received', v_cards_received,
    'has_event_cards', v_has_active_event
  );
END;
$function$;

-- ============================================================
-- 4. RECRIAR attack - Baseado em 20251212145719 com XP REDUZIDO (10/3)
-- ============================================================
CREATE OR REPLACE FUNCTION public.attack(p_battle_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_battle RECORD;
  v_game_state JSONB;
  v_attacker_field TEXT;
  v_defender_field TEXT;
  v_attacker_hp_key TEXT;
  v_defender_hp_key TEXT;
  v_player_turn TEXT;
  v_attacker_monster JSONB;
  v_defender_monster JSONB;
  v_damage INT;
  v_defender_hp INT;
  v_attacker_hp INT;
  v_effect JSONB;
  v_effect_type TEXT;
  v_effect_value NUMERIC;
  v_trap JSONB;
  v_remaining_traps JSONB;
  v_trap_activated BOOLEAN := false;
  v_trap_message TEXT := '';
  v_winner_id UUID := NULL;
  v_loser_id UUID := NULL;
  v_current_turn_number INT;
  v_summoned_on_turn INT;
  v_week_start DATE;
  v_reflect_damage INT;
  v_defender_traps JSONB;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batalha não encontrada';
  END IF;
  
  IF v_battle.status != 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Batalha não está em andamento';
  END IF;
  
  IF v_battle.player1_id = p_player_id THEN
    v_attacker_field := 'player1_field';
    v_defender_field := 'player2_field';
    v_attacker_hp_key := 'player1_hp';
    v_defender_hp_key := 'player2_hp';
    v_player_turn := 'PLAYER1';
  ELSIF v_battle.player2_id = p_player_id THEN
    v_attacker_field := 'player2_field';
    v_defender_field := 'player1_field';
    v_attacker_hp_key := 'player2_hp';
    v_defender_hp_key := 'player1_hp';
    v_player_turn := 'PLAYER2';
  ELSE
    RAISE EXCEPTION 'Você não está nesta batalha';
  END IF;
  
  -- FIX: Correct turn validation - compare current_turn with player_turn
  IF v_battle.current_turn != v_player_turn THEN
    RAISE EXCEPTION 'Não é seu turno';
  END IF;
  
  v_game_state := v_battle.game_state;
  v_current_turn_number := COALESCE((v_game_state->>'turn_number')::INT, 1);
  
  v_attacker_monster := v_game_state->v_attacker_field->'monster';
  v_defender_monster := v_game_state->v_defender_field->'monster';
  
  IF v_attacker_monster IS NULL OR v_attacker_monster = 'null'::jsonb THEN
    RAISE EXCEPTION 'Você não tem um monstro no campo';
  END IF;
  
  -- SUMMONING SICKNESS CHECK
  v_summoned_on_turn := COALESCE((v_attacker_monster->>'summoned_on_turn')::INT, 0);
  IF v_summoned_on_turn = v_current_turn_number THEN
    RAISE EXCEPTION 'Este monstro foi invocado neste turno e não pode atacar ainda (Summoning Sickness)';
  END IF;
  
  -- Check if already attacked this turn
  IF COALESCE((v_game_state->>'has_attacked_this_turn')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'Você já atacou neste turno';
  END IF;
  
  v_damage := COALESCE((v_attacker_monster->>'atk')::INT, 0);
  
  -- Apply attacker's effects (BOOST)
  IF v_attacker_monster->'effects' IS NOT NULL THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_attacker_monster->'effects')
    LOOP
      v_effect_type := v_effect->>'type';
      v_effect_value := COALESCE((v_effect->>'value')::NUMERIC, 0);
      
      IF v_effect_type = 'BOOST' THEN
        -- BOOST uses format 1.X where 1.6 = +60% ATK (base + extra)
        IF v_effect_value < 10 THEN
          v_damage := v_damage + FLOOR(v_damage * (v_effect_value - 1))::INT;
        ELSE
          v_damage := v_damage + FLOOR(v_damage * v_effect_value / 100)::INT;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- FIX: Use parentheses to ensure correct JSONB operator precedence
  -- Get defender's traps array first
  v_defender_traps := COALESCE((v_game_state->v_defender_field->'traps'), '[]'::jsonb);
  
  -- Check defender's traps
  IF jsonb_array_length(v_defender_traps) > 0 THEN
    -- Get first trap (index 0)
    v_trap := v_defender_traps->0;
    
    -- Remove first trap from array (remaining traps)
    v_remaining_traps := v_defender_traps - 0;
    
    IF v_trap->'effects' IS NOT NULL THEN
      FOR v_effect IN SELECT * FROM jsonb_array_elements(v_trap->'effects')
      LOOP
        v_effect_type := v_effect->>'type';
        v_effect_value := COALESCE((v_effect->>'value')::NUMERIC, 0);
        
        IF v_effect_type = 'REFLECT' THEN
          -- REFLECT: Calculate reflected damage
          IF v_effect_value < 1 THEN
            v_reflect_damage := FLOOR(v_damage * v_effect_value)::INT;
          ELSIF v_effect_value < 10 THEN
            v_reflect_damage := FLOOR(v_damage * v_effect_value)::INT;
          ELSE
            v_reflect_damage := FLOOR(v_damage * v_effect_value / 100)::INT;
          END IF;
          
          -- Apply reflected damage to attacker
          v_attacker_hp := COALESCE((v_game_state->>v_attacker_hp_key)::INT, 100);
          v_attacker_hp := v_attacker_hp - v_reflect_damage;
          v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_hp_key], to_jsonb(v_attacker_hp));
          
          -- REFLECT PROTECTS THE MONSTER: Set damage to 0
          v_damage := 0;
          
          v_trap_activated := true;
          v_trap_message := format('Armadilha %s ativada! Refletiu %s de dano e protegeu o monstro!', v_trap->>'name', v_reflect_damage);
          
        ELSIF v_effect_type = 'REDUCE' THEN
          -- REDUCE: Reduce incoming damage (monster still takes reduced damage)
          IF v_effect_value < 1 THEN
            v_damage := FLOOR(v_damage * (1 - v_effect_value))::INT;
          ELSIF v_effect_value < 10 THEN
            v_damage := FLOOR(v_damage / v_effect_value)::INT;
          ELSE
            v_damage := FLOOR(v_damage * (100 - v_effect_value) / 100)::INT;
          END IF;
          v_trap_activated := true;
          v_trap_message := format('Armadilha %s ativada! Dano reduzido para %s!', v_trap->>'name', v_damage);
          
        ELSIF v_effect_type = 'NULLIFY' OR v_effect_type = 'SHIELD' THEN
          -- NULLIFY/SHIELD: Block all damage
          v_damage := 0;
          v_trap_activated := true;
          v_trap_message := format('Armadilha %s ativada! Ataque completamente bloqueado!', v_trap->>'name');
        END IF;
      END LOOP;
    END IF;
    
    -- Remove activated trap
    IF v_trap_activated THEN
      v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'traps'], v_remaining_traps);
    END IF;
  END IF;
  
  -- Apply damage (only if damage > 0 after trap effects)
  IF v_damage > 0 THEN
    IF v_defender_monster IS NOT NULL AND v_defender_monster != 'null'::jsonb THEN
      DECLARE
        v_monster_hp INT;
        v_max_hp INT;
      BEGIN
        v_monster_hp := COALESCE((v_defender_monster->>'current_hp')::INT, (v_defender_monster->>'def')::INT, 0);
        v_max_hp := COALESCE((v_defender_monster->>'max_hp')::INT, (v_defender_monster->>'def')::INT, 0);
        v_monster_hp := v_monster_hp - v_damage;
        
        IF v_monster_hp <= 0 THEN
          v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'monster'], 'null'::jsonb);
          
          v_game_state := jsonb_set(
            v_game_state,
            '{battle_log}',
            COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
            jsonb_build_object(
              'action', 'MONSTER_DESTROYED',
              'player', v_player_turn,
              'monster_name', v_defender_monster->>'name',
              'damage', v_damage,
              'timestamp', NOW()
            )
          );
        ELSE
          v_defender_monster := jsonb_set(v_defender_monster, '{current_hp}', to_jsonb(v_monster_hp));
          v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'monster'], v_defender_monster);
        END IF;
      END;
    ELSE
      -- Direct damage to player HP
      v_defender_hp := COALESCE((v_game_state->>v_defender_hp_key)::INT, 100);
      v_defender_hp := v_defender_hp - v_damage;
      v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_hp_key], to_jsonb(v_defender_hp));
    END IF;
  END IF;
  
  v_game_state := jsonb_set(v_game_state, '{has_attacked_this_turn}', 'true'::jsonb);
  
  v_game_state := jsonb_set(
    v_game_state,
    '{battle_log}',
    COALESCE(v_game_state->'battle_log', '[]'::jsonb) || 
    jsonb_build_object(
      'action', 'ATTACK',
      'player', v_player_turn,
      'attacker', v_attacker_monster->>'name',
      'damage', v_damage,
      'trap_activated', v_trap_activated,
      'trap_message', v_trap_message,
      'timestamp', NOW()
    )
  );
  
  -- Check win conditions
  v_attacker_hp := COALESCE((v_game_state->>v_attacker_hp_key)::INT, 100);
  v_defender_hp := COALESCE((v_game_state->>v_defender_hp_key)::INT, 100);
  
  IF v_defender_hp <= 0 THEN
    v_winner_id := p_player_id;
    v_loser_id := CASE WHEN v_battle.player1_id = p_player_id THEN v_battle.player2_id ELSE v_battle.player1_id END;
  ELSIF v_attacker_hp <= 0 THEN
    v_winner_id := CASE WHEN v_battle.player1_id = p_player_id THEN v_battle.player2_id ELSE v_battle.player1_id END;
    v_loser_id := p_player_id;
  END IF;
  
  IF v_winner_id IS NOT NULL THEN
    -- ============================================================
    -- XP REBALANCEADO: Vitória = 10 XP, Derrota = 3 XP
    -- ============================================================
    
    -- Grant XP to winner (10 XP)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 10,
        level_xp = COALESCE(level_xp, 0) + 10
    WHERE id = v_winner_id;
    
    -- Grant XP to loser (3 XP for participation)
    UPDATE profiles 
    SET total_xp = COALESCE(total_xp, 0) + 3,
        level_xp = COALESCE(level_xp, 0) + 3
    WHERE id = v_loser_id;
    
    -- Log weekly XP for winner
    v_week_start := get_week_start(CURRENT_DATE);
    INSERT INTO weekly_xp_log (user_id, school_id, week_start, xp_earned, source)
    SELECT v_winner_id, current_school_id, v_week_start, 10, 'battle_win'
    FROM profiles WHERE id = v_winner_id AND current_school_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    
    -- Log weekly XP for loser
    INSERT INTO weekly_xp_log (user_id, school_id, week_start, xp_earned, source)
    SELECT v_loser_id, current_school_id, v_week_start, 3, 'battle_loss'
    FROM profiles WHERE id = v_loser_id AND current_school_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    
    UPDATE battles SET
      game_state = v_game_state,
      status = 'FINISHED',
      winner_id = v_winner_id,
      finished_at = NOW(),
      updated_at = NOW()
    WHERE id = p_battle_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'game_state', v_game_state, 
      'battle_ended', true, 
      'winner_id', v_winner_id,
      'xp_awarded', jsonb_build_object('winner', 10, 'loser', 3)
    );
  END IF;
  
  UPDATE battles SET
    game_state = v_game_state,
    last_action_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  RETURN jsonb_build_object('success', true, 'game_state', v_game_state, 'damage', v_damage, 'trap_activated', v_trap_activated, 'trap_message', v_trap_message);
END;
$function$;
-- ============================================================
-- REBALANCEAMENTO ECONÔMICO: XP de Batalha e Drop Rates
-- ============================================================

-- Dropar funções existentes para permitir recriação
DROP FUNCTION IF EXISTS public.attack(uuid, uuid);
DROP FUNCTION IF EXISTS public.open_card_pack(uuid, text);

-- 1. ATUALIZAR RPC attack - Recompensas de XP reduzidas
-- Vitória: 100 XP → 10 XP
-- Derrota: 25 XP → 3 XP
-- Objetivo: 10 vitórias = 1 pacote básico (economia controlada)
-- ============================================================

CREATE OR REPLACE FUNCTION public.attack(p_battle_id uuid, p_attacker_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_battle RECORD;
    v_game_state JSONB;
    v_attacker_field TEXT;
    v_defender_field TEXT;
    v_attacker_hp_field TEXT;
    v_defender_hp_field TEXT;
    v_attacker_monster JSONB;
    v_defender_monster JSONB;
    v_damage INTEGER;
    v_defender_hp INTEGER;
    v_attacker_hp INTEGER;
    v_battle_log JSONB;
    v_winner_id UUID := NULL;
    v_attacker_traps JSONB;
    v_defender_traps JSONB;
    v_trap_activated BOOLEAN := FALSE;
    v_trap_effect TEXT := NULL;
    v_trap_value INTEGER := 0;
    v_winner_xp INTEGER := 10;  -- REBALANCEADO: Era 100
    v_loser_xp INTEGER := 3;    -- REBALANCEADO: Era 25
    v_loser_id UUID := NULL;
BEGIN
    -- Get battle with FOR UPDATE to lock row
    SELECT * INTO v_battle
    FROM battles
    WHERE id = p_battle_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Battle not found');
    END IF;

    IF v_battle.status != 'IN_PROGRESS' THEN
        RETURN json_build_object('success', false, 'error', 'Battle is not in progress');
    END IF;

    IF v_battle.current_turn != p_attacker_id::text THEN
        RETURN json_build_object('success', false, 'error', 'Not your turn');
    END IF;

    v_game_state := v_battle.game_state;

    -- Determine fields based on attacker
    IF v_battle.player1_id = p_attacker_id THEN
        v_attacker_field := 'player1_field';
        v_defender_field := 'player2_field';
        v_attacker_hp_field := 'player1_hp';
        v_defender_hp_field := 'player2_hp';
        v_loser_id := v_battle.player2_id;
    ELSE
        v_attacker_field := 'player2_field';
        v_defender_field := 'player1_field';
        v_attacker_hp_field := 'player2_hp';
        v_defender_hp_field := 'player1_hp';
        v_loser_id := v_battle.player1_id;
    END IF;

    v_attacker_monster := v_game_state->v_attacker_field->'monster';
    v_defender_monster := v_game_state->v_defender_field->'monster';

    IF v_attacker_monster IS NULL OR v_attacker_monster = 'null'::jsonb THEN
        RETURN json_build_object('success', false, 'error', 'No monster to attack with');
    END IF;

    v_defender_hp := (v_game_state->>v_defender_hp_field)::INTEGER;
    v_attacker_hp := (v_game_state->>v_attacker_hp_field)::INTEGER;

    -- Get traps
    v_attacker_traps := COALESCE(v_game_state->v_attacker_field->'traps', '[]'::jsonb);
    v_defender_traps := COALESCE(v_game_state->v_defender_field->'traps', '[]'::jsonb);

    -- Calculate base damage
    IF v_defender_monster IS NOT NULL AND v_defender_monster != 'null'::jsonb THEN
        v_damage := GREATEST(0, (v_attacker_monster->>'atk')::INTEGER - (v_defender_monster->>'def')::INTEGER);
    ELSE
        v_damage := (v_attacker_monster->>'atk')::INTEGER;
    END IF;

    -- Check defender traps
    IF jsonb_array_length(v_defender_traps) > 0 THEN
        DECLARE
            v_trap JSONB := v_defender_traps->0;
            v_effects JSONB := v_trap->'effects';
            v_effect JSONB;
        BEGIN
            IF jsonb_array_length(v_effects) > 0 THEN
                v_effect := v_effects->0;
                v_trap_effect := v_effect->>'type';
                v_trap_value := COALESCE((v_effect->>'value')::INTEGER, 0);
                
                IF v_trap_effect = 'REFLECT' THEN
                    v_trap_activated := TRUE;
                    v_attacker_hp := v_attacker_hp - v_damage;
                    v_damage := 0;
                ELSIF v_trap_effect = 'REDUCE' THEN
                    v_trap_activated := TRUE;
                    v_damage := GREATEST(0, v_damage - v_trap_value);
                ELSIF v_trap_effect = 'SHIELD' OR v_trap_effect = 'NULLIFY' THEN
                    v_trap_activated := TRUE;
                    v_damage := 0;
                END IF;
            END IF;
            
            IF v_trap_activated THEN
                v_defender_traps := v_defender_traps - 0;
                v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_field, 'traps'], v_defender_traps);
            END IF;
        END;
    END IF;

    -- Apply damage to defender
    v_defender_hp := v_defender_hp - v_damage;

    -- Update HP in game state
    v_game_state := jsonb_set(v_game_state, ARRAY[v_defender_hp_field], to_jsonb(v_defender_hp));
    v_game_state := jsonb_set(v_game_state, ARRAY[v_attacker_hp_field], to_jsonb(v_attacker_hp));

    -- Add to battle log
    v_battle_log := COALESCE(v_game_state->'battle_log', '[]'::jsonb);
    v_battle_log := v_battle_log || jsonb_build_object(
        'action', 'ATTACK',
        'attacker_id', p_attacker_id,
        'damage', v_damage,
        'trap_activated', v_trap_activated,
        'trap_effect', v_trap_effect,
        'timestamp', now()
    );
    v_game_state := jsonb_set(v_game_state, ARRAY['battle_log'], v_battle_log);

    -- Check for winner
    IF v_defender_hp <= 0 THEN
        v_winner_id := p_attacker_id;
    ELSIF v_attacker_hp <= 0 THEN
        v_winner_id := v_loser_id;
        v_loser_id := p_attacker_id;
    END IF;

    -- Update battle
    IF v_winner_id IS NOT NULL THEN
        UPDATE battles
        SET 
            game_state = v_game_state,
            status = 'FINISHED',
            winner_id = v_winner_id,
            finished_at = now(),
            updated_at = now()
        WHERE id = p_battle_id;

        -- Award XP to winner (REBALANCEADO: 10 XP)
        UPDATE profiles 
        SET 
            level_xp = COALESCE(level_xp, 0) + v_winner_xp,
            total_xp = COALESCE(total_xp, 0) + v_winner_xp
        WHERE id = v_winner_id;

        -- Award consolation XP to loser (REBALANCEADO: 3 XP)
        UPDATE profiles 
        SET 
            level_xp = COALESCE(level_xp, 0) + v_loser_xp,
            total_xp = COALESCE(total_xp, 0) + v_loser_xp
        WHERE id = v_loser_id;

        -- Log XP in weekly_xp_log for ranking
        INSERT INTO weekly_xp_log (user_id, xp_amount, source, week_start)
        VALUES 
            (v_winner_id, v_winner_xp, 'battle_win', date_trunc('week', now())),
            (v_loser_id, v_loser_xp, 'battle_loss', date_trunc('week', now()));

        -- Remove from queue
        DELETE FROM battle_queue WHERE user_id IN (v_battle.player1_id, v_battle.player2_id);
    ELSE
        -- Switch turns
        UPDATE battles
        SET 
            game_state = v_game_state,
            current_turn = CASE 
                WHEN player1_id = p_attacker_id THEN player2_id::text
                ELSE player1_id::text
            END,
            turn_started_at = now(),
            last_action_at = now(),
            updated_at = now()
        WHERE id = p_battle_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'damage', v_damage,
        'defender_hp', v_defender_hp,
        'attacker_hp', v_attacker_hp,
        'trap_activated', v_trap_activated,
        'trap_effect', v_trap_effect,
        'winner_id', v_winner_id
    );
END;
$$;


-- ============================================================
-- 2. ATUALIZAR RPC open_card_pack - Novas Probabilidades com Garantias
-- ============================================================
-- BASIC: Comum 80%, Rara 19%, Épica 0.9%, Lendária 0.1%
-- RARE: Comum 50%, Rara 45%, Épica 4.5%, Lendária 0.5%
-- EPIC: 1 ÉPICA GARANTIDA + 4 cartas (Comum 40%, Rara 50%, Épica 9%, Lendária 1%) + SHUFFLE
-- LEGENDARY: 1 LENDÁRIA GARANTIDA + 6 cartas (SEM COMUM - Rara 60%, Épica 35%, Lendária 5%) + SHUFFLE
-- ============================================================

CREATE OR REPLACE FUNCTION public.open_card_pack(
    p_user_id uuid,
    p_pack_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_pack_cost INTEGER;
    v_pack_size INTEGER;
    v_cards_received UUID[] := '{}';
    v_card_record RECORD;
    v_roll FLOAT;
    v_rarity TEXT;
    v_i INTEGER;
    v_common_prob FLOAT;
    v_rare_prob FLOAT;
    v_epic_prob FLOAT;
    v_legendary_prob FLOAT;
    v_has_guaranteed_epic BOOLEAN := FALSE;
    v_has_guaranteed_legendary BOOLEAN := FALSE;
    v_guaranteed_card_id UUID;
    v_extra_cards_count INTEGER;
    v_shuffle_index INTEGER;
    v_temp_id UUID;
BEGIN
    -- Get user profile
    SELECT * INTO v_user FROM profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Set pack costs and sizes
    CASE p_pack_type
        WHEN 'BASIC' THEN 
            v_pack_cost := 100; v_pack_size := 3;
            v_common_prob := 0.80; v_rare_prob := 0.19; v_epic_prob := 0.009; v_legendary_prob := 0.001;
        WHEN 'RARE' THEN 
            v_pack_cost := 500; v_pack_size := 5;
            v_common_prob := 0.50; v_rare_prob := 0.45; v_epic_prob := 0.045; v_legendary_prob := 0.005;
        WHEN 'EPIC' THEN 
            v_pack_cost := 1500; v_pack_size := 5;
            v_has_guaranteed_epic := TRUE;
            v_extra_cards_count := 4;
            v_common_prob := 0.40; v_rare_prob := 0.50; v_epic_prob := 0.09; v_legendary_prob := 0.01;
        WHEN 'LEGENDARY' THEN 
            v_pack_cost := 5000; v_pack_size := 7;
            v_has_guaranteed_legendary := TRUE;
            v_extra_cards_count := 6;
            -- SEM COMUM neste pacote
            v_common_prob := 0.00; v_rare_prob := 0.60; v_epic_prob := 0.35; v_legendary_prob := 0.05;
        WHEN 'FREE' THEN 
            v_pack_cost := 0; v_pack_size := 5;
            v_common_prob := 0.80; v_rare_prob := 0.18; v_epic_prob := 0.02; v_legendary_prob := 0.00;
        WHEN 'EVENT' THEN
            v_pack_cost := 8000; v_pack_size := 1;
            -- Event pack handled separately
        ELSE
            RETURN json_build_object('success', false, 'error', 'Invalid pack type');
    END CASE;

    -- Check if user has enough XP (unless free)
    IF p_pack_type != 'FREE' AND COALESCE(v_user.level_xp, 0) < v_pack_cost THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient XP');
    END IF;

    -- Handle EVENT pack separately
    IF p_pack_type = 'EVENT' THEN
        SELECT id INTO v_card_record
        FROM cards
        WHERE is_active = true AND event_id IS NOT NULL
        ORDER BY random()
        LIMIT 1;

        IF v_card_record.id IS NOT NULL THEN
            v_cards_received := array_append(v_cards_received, v_card_record.id);
        END IF;
    ELSE
        -- ============================================================
        -- PACOTES COM GARANTIA (ÉPICO e LENDÁRIO)
        -- ============================================================
        IF v_has_guaranteed_epic THEN
            -- Selecionar 1 carta ÉPICA garantida
            SELECT id INTO v_guaranteed_card_id
            FROM cards
            WHERE is_active = true AND rarity = 'EPIC' AND event_id IS NULL
            ORDER BY random()
            LIMIT 1;
            
            IF v_guaranteed_card_id IS NOT NULL THEN
                v_cards_received := array_append(v_cards_received, v_guaranteed_card_id);
            END IF;
            
            -- Gerar as 4 cartas extras com probabilidades normais
            FOR v_i IN 1..v_extra_cards_count LOOP
                v_roll := random();
                IF v_roll < v_legendary_prob THEN
                    v_rarity := 'LEGENDARY';
                ELSIF v_roll < v_legendary_prob + v_epic_prob THEN
                    v_rarity := 'EPIC';
                ELSIF v_roll < v_legendary_prob + v_epic_prob + v_rare_prob THEN
                    v_rarity := 'RARE';
                ELSE
                    v_rarity := 'COMMON';
                END IF;

                SELECT id INTO v_card_record
                FROM cards
                WHERE is_active = true AND rarity = v_rarity AND event_id IS NULL
                ORDER BY random()
                LIMIT 1;

                IF v_card_record.id IS NOT NULL THEN
                    v_cards_received := array_append(v_cards_received, v_card_record.id);
                END IF;
            END LOOP;
            
        ELSIF v_has_guaranteed_legendary THEN
            -- Selecionar 1 carta LENDÁRIA garantida
            SELECT id INTO v_guaranteed_card_id
            FROM cards
            WHERE is_active = true AND rarity = 'LEGENDARY' AND event_id IS NULL
            ORDER BY random()
            LIMIT 1;
            
            IF v_guaranteed_card_id IS NOT NULL THEN
                v_cards_received := array_append(v_cards_received, v_guaranteed_card_id);
            END IF;
            
            -- Gerar as 6 cartas extras (SEM COMUM)
            FOR v_i IN 1..v_extra_cards_count LOOP
                v_roll := random();
                -- Probabilidades normalizadas (sem comum): Rara 60%, Épica 35%, Lendária 5%
                IF v_roll < v_legendary_prob THEN
                    v_rarity := 'LEGENDARY';
                ELSIF v_roll < v_legendary_prob + v_epic_prob THEN
                    v_rarity := 'EPIC';
                ELSE
                    v_rarity := 'RARE';
                END IF;

                SELECT id INTO v_card_record
                FROM cards
                WHERE is_active = true AND rarity = v_rarity AND event_id IS NULL
                ORDER BY random()
                LIMIT 1;

                IF v_card_record.id IS NOT NULL THEN
                    v_cards_received := array_append(v_cards_received, v_card_record.id);
                END IF;
            END LOOP;
        ELSE
            -- ============================================================
            -- PACOTES NORMAIS (BASIC, RARE, FREE)
            -- ============================================================
            FOR v_i IN 1..v_pack_size LOOP
                v_roll := random();
                IF v_roll < v_legendary_prob THEN
                    v_rarity := 'LEGENDARY';
                ELSIF v_roll < v_legendary_prob + v_epic_prob THEN
                    v_rarity := 'EPIC';
                ELSIF v_roll < v_legendary_prob + v_epic_prob + v_rare_prob THEN
                    v_rarity := 'RARE';
                ELSE
                    v_rarity := 'COMMON';
                END IF;

                SELECT id INTO v_card_record
                FROM cards
                WHERE is_active = true AND rarity = v_rarity AND event_id IS NULL
                ORDER BY random()
                LIMIT 1;

                IF v_card_record.id IS NOT NULL THEN
                    v_cards_received := array_append(v_cards_received, v_card_record.id);
                END IF;
            END LOOP;
        END IF;
        
        -- ============================================================
        -- SHUFFLE: Embaralhar array para suspense (carta garantida em posição aleatória)
        -- Fisher-Yates shuffle algorithm
        -- ============================================================
        IF v_has_guaranteed_epic OR v_has_guaranteed_legendary THEN
            FOR v_i IN REVERSE array_length(v_cards_received, 1)..2 LOOP
                v_shuffle_index := floor(random() * v_i) + 1;
                -- Swap elements
                v_temp_id := v_cards_received[v_i];
                v_cards_received[v_i] := v_cards_received[v_shuffle_index];
                v_cards_received[v_shuffle_index] := v_temp_id;
            END LOOP;
        END IF;
    END IF;

    -- Deduct XP
    IF p_pack_type != 'FREE' THEN
        UPDATE profiles 
        SET level_xp = COALESCE(level_xp, 0) - v_pack_cost
        WHERE id = p_user_id;
    END IF;

    -- Add cards to user collection
    FOREACH v_temp_id IN ARRAY v_cards_received
    LOOP
        INSERT INTO user_cards (user_id, card_id, quantity, unlock_source)
        VALUES (p_user_id, v_temp_id, 1, 'PACK')
        ON CONFLICT (user_id, card_id) 
        DO UPDATE SET quantity = user_cards.quantity + 1;
    END LOOP;

    -- Log pack opening
    INSERT INTO card_packs (user_id, pack_type, cards_received, xp_cost)
    VALUES (p_user_id, p_pack_type, v_cards_received, v_pack_cost);

    RETURN json_build_object(
        'success', true,
        'pack_type', p_pack_type,
        'xp_spent', v_pack_cost,
        'cards_received', v_cards_received
    );
END;
$$;
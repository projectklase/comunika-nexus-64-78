-- Add event_pack_name column to card_events
ALTER TABLE card_events ADD COLUMN IF NOT EXISTS event_pack_name TEXT DEFAULT 'Pacote Especial';

-- Update open_card_pack RPC to support EVENT pack type
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
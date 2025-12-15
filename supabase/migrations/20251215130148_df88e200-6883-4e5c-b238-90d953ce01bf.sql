-- Drop existing function
DROP FUNCTION IF EXISTS public.open_card_pack(text, boolean);

-- Recreate with correct UUID[] type
CREATE OR REPLACE FUNCTION public.open_card_pack(
  p_pack_type TEXT,
  p_is_free BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_pack_cost INTEGER;
  v_pack_size INTEGER;
  v_user_xp INTEGER;
  v_cards_to_give INTEGER;
  v_card_ids UUID[] := ARRAY[]::UUID[];
  v_selected_card RECORD;
  v_rarity TEXT;
  v_roll FLOAT;
  v_guaranteed_rare BOOLEAN := false;
  v_guaranteed_epic BOOLEAN := false;
  v_guaranteed_legendary BOOLEAN := false;
  v_has_rare BOOLEAN := false;
  v_has_epic BOOLEAN := false;
  v_has_legendary BOOLEAN := false;
  v_upper_pack_type TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Normalize pack type to uppercase
  v_upper_pack_type := UPPER(p_pack_type);

  -- Define pack costs (XP)
  v_pack_cost := CASE v_upper_pack_type
    WHEN 'BASIC' THEN 100
    WHEN 'RARE' THEN 250
    WHEN 'EPIC' THEN 500
    WHEN 'LEGENDARY' THEN 1000
    WHEN 'FREE' THEN 0
    WHEN 'EVENT' THEN 0
    ELSE 100
  END;

  -- Define pack sizes
  v_pack_size := CASE v_upper_pack_type
    WHEN 'BASIC' THEN 5
    WHEN 'RARE' THEN 5
    WHEN 'EPIC' THEN 5
    WHEN 'LEGENDARY' THEN 5
    WHEN 'FREE' THEN 7
    WHEN 'EVENT' THEN 3
    ELSE 5
  END;

  -- Define guarantees per pack type
  IF v_upper_pack_type = 'RARE' THEN
    v_guaranteed_rare := true;
  ELSIF v_upper_pack_type = 'EPIC' THEN
    v_guaranteed_rare := true;
    v_guaranteed_epic := true;
  ELSIF v_upper_pack_type = 'LEGENDARY' THEN
    v_guaranteed_rare := true;
    v_guaranteed_epic := true;
    v_guaranteed_legendary := true;
  ELSIF v_upper_pack_type = 'FREE' THEN
    v_guaranteed_rare := true;
  END IF;

  -- Check if free pack and user already received one
  IF p_is_free THEN
    IF (SELECT has_received_starter_pack FROM profiles WHERE id = v_user_id) THEN
      RAISE EXCEPTION 'Starter pack already claimed';
    END IF;
    v_pack_cost := 0;
  ELSE
    -- Check user XP
    SELECT COALESCE(total_xp, 0) INTO v_user_xp FROM profiles WHERE id = v_user_id;
    IF v_user_xp < v_pack_cost THEN
      RAISE EXCEPTION 'Not enough XP. Required: %, Available: %', v_pack_cost, v_user_xp;
    END IF;
  END IF;

  v_cards_to_give := v_pack_size;

  -- Select cards based on rarity drop rates
  FOR i IN 1..v_cards_to_give LOOP
    v_roll := random();
    
    -- Determine rarity based on pack type and roll
    -- Basic pack: 70% common, 25% rare, 4% epic, 1% legendary
    -- Rare pack: 50% common, 35% rare, 12% epic, 3% legendary
    -- Epic pack: 30% common, 40% rare, 25% epic, 5% legendary
    -- Legendary pack: 20% common, 35% rare, 35% epic, 10% legendary
    
    IF v_upper_pack_type = 'BASIC' OR v_upper_pack_type = 'FREE' THEN
      IF v_roll < 0.01 THEN v_rarity := 'legendary';
      ELSIF v_roll < 0.05 THEN v_rarity := 'epic';
      ELSIF v_roll < 0.30 THEN v_rarity := 'rare';
      ELSE v_rarity := 'common';
      END IF;
    ELSIF v_upper_pack_type = 'RARE' THEN
      IF v_roll < 0.03 THEN v_rarity := 'legendary';
      ELSIF v_roll < 0.15 THEN v_rarity := 'epic';
      ELSIF v_roll < 0.50 THEN v_rarity := 'rare';
      ELSE v_rarity := 'common';
      END IF;
    ELSIF v_upper_pack_type = 'EPIC' THEN
      IF v_roll < 0.05 THEN v_rarity := 'legendary';
      ELSIF v_roll < 0.30 THEN v_rarity := 'epic';
      ELSIF v_roll < 0.70 THEN v_rarity := 'rare';
      ELSE v_rarity := 'common';
      END IF;
    ELSIF v_upper_pack_type = 'LEGENDARY' THEN
      IF v_roll < 0.10 THEN v_rarity := 'legendary';
      ELSIF v_roll < 0.45 THEN v_rarity := 'epic';
      ELSIF v_roll < 0.80 THEN v_rarity := 'rare';
      ELSE v_rarity := 'common';
      END IF;
    ELSE
      IF v_roll < 0.01 THEN v_rarity := 'legendary';
      ELSIF v_roll < 0.05 THEN v_rarity := 'epic';
      ELSIF v_roll < 0.30 THEN v_rarity := 'rare';
      ELSE v_rarity := 'common';
      END IF;
    END IF;

    -- Track what rarities we got
    IF v_rarity = 'rare' THEN v_has_rare := true; END IF;
    IF v_rarity = 'epic' THEN v_has_epic := true; END IF;
    IF v_rarity = 'legendary' THEN v_has_legendary := true; END IF;

    -- Select a random card of the determined rarity
    SELECT id INTO v_selected_card
    FROM cards
    WHERE rarity = v_rarity
      AND is_active = true
      AND (school_id IS NULL OR school_id = (SELECT current_school_id FROM profiles WHERE id = v_user_id))
    ORDER BY random()
    LIMIT 1;

    -- If no card found for rarity, fall back to common
    IF v_selected_card.id IS NULL THEN
      SELECT id INTO v_selected_card
      FROM cards
      WHERE rarity = 'common'
        AND is_active = true
        AND (school_id IS NULL OR school_id = (SELECT current_school_id FROM profiles WHERE id = v_user_id))
      ORDER BY random()
      LIMIT 1;
    END IF;

    IF v_selected_card.id IS NOT NULL THEN
      v_card_ids := array_append(v_card_ids, v_selected_card.id);
    END IF;
  END LOOP;

  -- Ensure guarantees are met
  IF v_guaranteed_legendary AND NOT v_has_legendary THEN
    SELECT id INTO v_selected_card FROM cards WHERE rarity = 'legendary' AND is_active = true ORDER BY random() LIMIT 1;
    IF v_selected_card.id IS NOT NULL AND array_length(v_card_ids, 1) > 0 THEN
      v_card_ids[1] := v_selected_card.id;
    END IF;
  END IF;

  IF v_guaranteed_epic AND NOT v_has_epic THEN
    SELECT id INTO v_selected_card FROM cards WHERE rarity = 'epic' AND is_active = true ORDER BY random() LIMIT 1;
    IF v_selected_card.id IS NOT NULL AND array_length(v_card_ids, 1) > 1 THEN
      v_card_ids[2] := v_selected_card.id;
    END IF;
  END IF;

  IF v_guaranteed_rare AND NOT v_has_rare THEN
    SELECT id INTO v_selected_card FROM cards WHERE rarity = 'rare' AND is_active = true ORDER BY random() LIMIT 1;
    IF v_selected_card.id IS NOT NULL AND array_length(v_card_ids, 1) > 2 THEN
      v_card_ids[3] := v_selected_card.id;
    END IF;
  END IF;

  -- Shuffle card_ids using Fisher-Yates
  FOR i IN REVERSE array_length(v_card_ids, 1)..2 LOOP
    DECLARE
      j INTEGER := floor(random() * i + 1)::INTEGER;
      temp UUID := v_card_ids[i];
    BEGIN
      v_card_ids[i] := v_card_ids[j];
      v_card_ids[j] := temp;
    END;
  END LOOP;

  -- Deduct XP if not free
  IF NOT p_is_free AND v_pack_cost > 0 THEN
    UPDATE profiles SET total_xp = COALESCE(total_xp, 0) - v_pack_cost WHERE id = v_user_id;
  END IF;

  -- Mark starter pack as received if free
  IF p_is_free THEN
    UPDATE profiles SET has_received_starter_pack = true WHERE id = v_user_id;
  END IF;

  -- Add cards to user collection
  FOR i IN 1..array_length(v_card_ids, 1) LOOP
    INSERT INTO user_cards (user_id, card_id, quantity, unlock_source)
    VALUES (v_user_id, v_card_ids[i], 1, v_upper_pack_type)
    ON CONFLICT (user_id, card_id) 
    DO UPDATE SET quantity = user_cards.quantity + 1;
  END LOOP;

  -- Record pack opening
  INSERT INTO card_packs (user_id, pack_type, cards_received, xp_cost)
  VALUES (v_user_id, v_upper_pack_type, v_card_ids, v_pack_cost);

  -- Return the cards
  RETURN jsonb_build_object(
    'success', true,
    'pack_type', v_upper_pack_type,
    'cards', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'rarity', c.rarity,
          'category', c.category,
          'atk', c.atk,
          'def', c.def,
          'description', c.description,
          'image_url', c.image_url,
          'effects', c.effects
        )
      )
      FROM cards c
      WHERE c.id = ANY(v_card_ids)
    ),
    'xp_spent', v_pack_cost
  );
END;
$$;
CREATE OR REPLACE FUNCTION public.open_card_pack(p_user_id uuid, p_pack_type text, p_is_free boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
BEGIN
  -- Define pack costs, sizes and HARDER probabilities for grind
  CASE p_pack_type
    WHEN 'BASIC' THEN
      v_xp_cost := 100;
      v_pack_size := 3;
      v_common_prob := 0.85;
      v_rare_prob := 0.13;
      v_epic_prob := 0.019;
      v_legendary_prob := 0.001;
    WHEN 'RARE' THEN
      v_xp_cost := 500;
      v_pack_size := 5;
      v_common_prob := 0.60;
      v_rare_prob := 0.35;
      v_epic_prob := 0.045;
      v_legendary_prob := 0.005;
    WHEN 'EPIC' THEN
      v_xp_cost := 1500;
      v_pack_size := 5;
      v_common_prob := 0.40;
      v_rare_prob := 0.45;
      v_epic_prob := 0.14;
      v_legendary_prob := 0.01;
    WHEN 'LEGENDARY' THEN
      v_xp_cost := 5000;
      v_pack_size := 7;
      v_common_prob := 0.25;
      v_rare_prob := 0.45;
      v_epic_prob := 0.25;
      v_legendary_prob := 0.05;
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

    -- Deduct XP from user
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
    
    -- Determine rarity based on probabilities
    IF v_random < v_common_prob THEN
      v_rarity := 'COMMON';
    ELSIF v_random < (v_common_prob + v_rare_prob) THEN
      v_rarity := 'RARE';
    ELSIF v_random < (v_common_prob + v_rare_prob + v_epic_prob) THEN
      v_rarity := 'EPIC';
    ELSE
      v_rarity := 'LEGENDARY';
    END IF;

    -- Select a random card of the determined rarity
    SELECT * INTO v_card
    FROM cards
    WHERE rarity = v_rarity
      AND is_active = TRUE
      AND required_level <= v_user_level
    ORDER BY random()
    LIMIT 1;

    -- If no card found (user level too low), try COMMON
    IF NOT FOUND THEN
      SELECT * INTO v_card
      FROM cards
      WHERE rarity = 'COMMON'
        AND is_active = TRUE
        AND required_level <= v_user_level
      ORDER BY random()
      LIMIT 1;
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
        'rarity', v_card.rarity,
        'category', v_card.category,
        'atk', v_card.atk,
        'def', v_card.def,
        'effects', v_card.effects,
        'image_url', v_card.image_url
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
    'cards_received', v_cards_received
  );
END;
$function$;
-- Drop existing function to recreate with correct pack type names
DROP FUNCTION IF EXISTS public.open_card_pack(uuid, text, boolean);

-- Recreate function with UPPERCASE pack type names matching frontend
CREATE OR REPLACE FUNCTION public.open_card_pack(
  p_user_id UUID,
  p_pack_type TEXT,
  p_is_free BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_xp INTEGER;
  v_xp_cost INTEGER;
  v_card_count INTEGER;
  v_cards_result jsonb := '[]'::jsonb;
  v_card_ids TEXT[] := ARRAY[]::TEXT[];
  v_selected_card RECORD;
  v_rarity TEXT;
  v_rand FLOAT;
  v_i INTEGER;
  v_available_cards RECORD;
  v_guaranteed_rare BOOLEAN := false;
  v_guaranteed_epic BOOLEAN := false;
  v_guaranteed_legendary BOOLEAN := false;
  v_has_guaranteed BOOLEAN := false;
  v_event_id UUID := NULL;
  v_temp INTEGER;
  v_shuffled_cards jsonb := '[]'::jsonb;
  v_card_array jsonb[];
  v_arr_len INTEGER;
  -- Drop rates per pack type
  v_common_rate FLOAT;
  v_rare_rate FLOAT;
  v_epic_rate FLOAT;
  v_legendary_rate FLOAT;
BEGIN
  -- Get user XP
  SELECT COALESCE(total_xp, 0) INTO v_user_xp
  FROM profiles WHERE id = p_user_id;

  -- Set pack parameters based on type (UPPERCASE names from frontend)
  CASE p_pack_type
    WHEN 'BASIC' THEN
      v_xp_cost := 100;
      v_card_count := 3;
      v_guaranteed_rare := false;
      v_common_rate := 0.80;
      v_rare_rate := 0.19;
      v_epic_rate := 0.009;
      v_legendary_rate := 0.001;
    WHEN 'RARE' THEN
      v_xp_cost := 500;
      v_card_count := 5;
      v_guaranteed_rare := true;
      v_common_rate := 0.55;
      v_rare_rate := 0.35;
      v_epic_rate := 0.09;
      v_legendary_rate := 0.01;
    WHEN 'EPIC' THEN
      v_xp_cost := 1500;
      v_card_count := 5;
      v_guaranteed_epic := true;
      v_common_rate := 0.40;
      v_rare_rate := 0.35;
      v_epic_rate := 0.20;
      v_legendary_rate := 0.05;
    WHEN 'LEGENDARY' THEN
      v_xp_cost := 5000;
      v_card_count := 7;
      v_guaranteed_legendary := true;
      -- No common cards in legendary packs
      v_common_rate := 0.00;
      v_rare_rate := 0.50;
      v_epic_rate := 0.35;
      v_legendary_rate := 0.15;
    WHEN 'FREE' THEN
      v_xp_cost := 0;
      v_card_count := 5;
      v_guaranteed_rare := false;
      v_common_rate := 0.70;
      v_rare_rate := 0.25;
      v_epic_rate := 0.04;
      v_legendary_rate := 0.01;
    WHEN 'EVENT' THEN
      v_xp_cost := 8000;
      v_card_count := 1;
      v_guaranteed_legendary := true;
      v_common_rate := 0.00;
      v_rare_rate := 0.00;
      v_epic_rate := 0.00;
      v_legendary_rate := 1.00;
      -- Get active event
      SELECT id INTO v_event_id
      FROM card_events
      WHERE is_active = true
        AND starts_at <= NOW()
        AND ends_at >= NOW()
      LIMIT 1;
      
      IF v_event_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum evento ativo no momento';
      END IF;
    ELSE
      RAISE EXCEPTION 'Tipo de pacote inválido: %', p_pack_type;
  END CASE;

  -- Skip XP check for free packs
  IF NOT p_is_free THEN
    IF v_user_xp < v_xp_cost THEN
      RAISE EXCEPTION 'XP insuficiente. Necessário: %, Disponível: %', v_xp_cost, v_user_xp;
    END IF;
    
    -- Deduct XP
    UPDATE profiles
    SET total_xp = total_xp - v_xp_cost
    WHERE id = p_user_id;
  END IF;

  -- Generate cards
  FOR v_i IN 1..v_card_count LOOP
    -- Check guarantees for last cards
    IF v_i = v_card_count AND NOT v_has_guaranteed THEN
      IF v_guaranteed_legendary THEN
        v_rarity := 'legendary';
        v_has_guaranteed := true;
      ELSIF v_guaranteed_epic THEN
        v_rarity := 'epic';
        v_has_guaranteed := true;
      ELSIF v_guaranteed_rare THEN
        v_rarity := 'rare';
        v_has_guaranteed := true;
      END IF;
    END IF;

    -- Roll for rarity if not guaranteed
    IF v_rarity IS NULL THEN
      v_rand := random();
      IF v_rand < v_legendary_rate THEN
        v_rarity := 'legendary';
        IF v_guaranteed_legendary THEN v_has_guaranteed := true; END IF;
      ELSIF v_rand < v_legendary_rate + v_epic_rate THEN
        v_rarity := 'epic';
        IF v_guaranteed_epic OR v_guaranteed_legendary THEN v_has_guaranteed := true; END IF;
      ELSIF v_rand < v_legendary_rate + v_epic_rate + v_rare_rate THEN
        v_rarity := 'rare';
        IF v_guaranteed_rare OR v_guaranteed_epic OR v_guaranteed_legendary THEN v_has_guaranteed := true; END IF;
      ELSE
        v_rarity := 'common';
      END IF;
    END IF;

    -- Select random card of rarity
    IF v_event_id IS NOT NULL THEN
      SELECT * INTO v_selected_card
      FROM cards
      WHERE rarity = v_rarity
        AND is_active = true
        AND event_id = v_event_id
      ORDER BY random()
      LIMIT 1;
    ELSE
      SELECT * INTO v_selected_card
      FROM cards
      WHERE rarity = v_rarity
        AND is_active = true
        AND event_id IS NULL
      ORDER BY random()
      LIMIT 1;
    END IF;

    -- Fallback to any card of same rarity if not found
    IF v_selected_card IS NULL THEN
      SELECT * INTO v_selected_card
      FROM cards
      WHERE rarity = v_rarity
        AND is_active = true
      ORDER BY random()
      LIMIT 1;
    END IF;

    -- If still null, get any active card
    IF v_selected_card IS NULL THEN
      SELECT * INTO v_selected_card
      FROM cards
      WHERE is_active = true
      ORDER BY random()
      LIMIT 1;
    END IF;

    IF v_selected_card IS NOT NULL THEN
      v_card_ids := array_append(v_card_ids, v_selected_card.id::TEXT);
      v_cards_result := v_cards_result || jsonb_build_object(
        'id', v_selected_card.id,
        'name', v_selected_card.name,
        'rarity', v_selected_card.rarity,
        'category', v_selected_card.category,
        'atk', v_selected_card.atk,
        'def', v_selected_card.def,
        'image_url', v_selected_card.image_url,
        'effects', v_selected_card.effects,
        'description', v_selected_card.description
      );
    END IF;

    v_rarity := NULL;
  END LOOP;

  -- Fisher-Yates shuffle
  SELECT array_agg(elem) INTO v_card_array
  FROM jsonb_array_elements(v_cards_result) elem;
  
  v_arr_len := array_length(v_card_array, 1);
  IF v_arr_len IS NOT NULL AND v_arr_len > 1 THEN
    FOR v_i IN REVERSE v_arr_len..2 LOOP
      v_temp := floor(random() * v_i) + 1;
      -- Swap elements
      IF v_temp != v_i THEN
        SELECT v_card_array[v_i], v_card_array[v_temp]
        INTO v_card_array[v_temp], v_card_array[v_i];
      END IF;
    END LOOP;
    
    v_shuffled_cards := '[]'::jsonb;
    FOR v_i IN 1..v_arr_len LOOP
      v_shuffled_cards := v_shuffled_cards || v_card_array[v_i];
    END LOOP;
    v_cards_result := v_shuffled_cards;
  END IF;

  -- Record pack opening
  INSERT INTO card_packs (user_id, pack_type, cards_received, xp_cost)
  VALUES (p_user_id, p_pack_type, v_card_ids, CASE WHEN p_is_free THEN 0 ELSE v_xp_cost END);

  -- Add cards to user collection
  FOR v_i IN 0..(jsonb_array_length(v_cards_result) - 1) LOOP
    INSERT INTO user_cards (user_id, card_id, quantity, unlock_source)
    VALUES (
      p_user_id,
      (v_cards_result->v_i->>'id')::UUID,
      1,
      CASE WHEN p_is_free THEN 'starter_pack' ELSE 'pack_' || lower(p_pack_type) END
    )
    ON CONFLICT (user_id, card_id)
    DO UPDATE SET quantity = user_cards.quantity + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'cards', v_cards_result,
    'xp_spent', CASE WHEN p_is_free THEN 0 ELSE v_xp_cost END
  );
END;
$$;
-- RPC para reivindicar pacote inicial gratuito
CREATE OR REPLACE FUNCTION public.claim_free_starter_pack(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_already_claimed BOOLEAN;
  v_cards_to_give INTEGER := 5;
  v_card RECORD;
  v_result_cards UUID[] := '{}';
  v_rarity TEXT;
  v_roll NUMERIC;
BEGIN
  -- Verificar se já reivindicou
  SELECT EXISTS(
    SELECT 1 FROM card_packs 
    WHERE user_id = p_user_id AND pack_type = 'FREE'
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RAISE EXCEPTION 'Você já reivindicou seu pacote inicial gratuito!';
  END IF;

  -- Sortear 5 cartas: 50% COMMON, 40% RARE, 10% EPIC
  FOR i IN 1..v_cards_to_give LOOP
    v_roll := random();
    
    IF v_roll < 0.50 THEN v_rarity := 'COMMON';
    ELSIF v_roll < 0.90 THEN v_rarity := 'RARE';
    ELSE v_rarity := 'EPIC';
    END IF;

    SELECT id INTO v_card
    FROM cards
    WHERE rarity = v_rarity
      AND is_active = true
      AND required_level <= 1
    ORDER BY random()
    LIMIT 1;

    IF v_card.id IS NOT NULL THEN
      v_result_cards := array_append(v_result_cards, v_card.id);
      
      INSERT INTO user_cards (user_id, card_id, quantity, unlock_source)
      VALUES (p_user_id, v_card.id, 1, 'REWARD')
      ON CONFLICT (user_id, card_id) 
      DO UPDATE SET quantity = user_cards.quantity + 1;
    END IF;
  END LOOP;

  -- Registrar pacote FREE
  INSERT INTO card_packs (user_id, pack_type, cards_received, xp_cost)
  VALUES (p_user_id, 'FREE', v_result_cards, 0);

  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'pack_type', 'FREE',
    'xp_spent', 0,
    'cards_received', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'rarity', c.rarity,
          'atk', c.atk,
          'def', c.def,
          'category', c.category,
          'image_url', c.image_url,
          'effects', c.effects
        )
      )
      FROM cards c
      WHERE c.id = ANY(v_result_cards)
    )
  );
END;
$$;
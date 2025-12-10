-- Corrigir função claim_free_starter_pack para garantir sempre 5 cartas
-- Remove filtro required_level e adiciona sistema de fallback

CREATE OR REPLACE FUNCTION public.claim_free_starter_pack(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_already_claimed BOOLEAN;
  v_cards_to_give INTEGER := 5;
  v_card RECORD;
  v_result_cards UUID[] := '{}';
  v_rarity TEXT;
  v_roll NUMERIC;
  v_fallback_rarity TEXT;
  v_fallback_rarities TEXT[] := ARRAY['COMMON', 'RARE', 'EPIC'];
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
    v_card := NULL;
    
    -- Determinar raridade inicial
    IF v_roll < 0.50 THEN 
      v_rarity := 'COMMON';
    ELSIF v_roll < 0.90 THEN 
      v_rarity := 'RARE';
    ELSE 
      v_rarity := 'EPIC';
    END IF;

    -- Tentar encontrar carta da raridade sorteada (SEM filtro de level)
    SELECT id, name, rarity, atk, def, category, image_url, effects 
    INTO v_card
    FROM cards
    WHERE rarity = v_rarity
      AND is_active = true
      AND event_id IS NULL
    ORDER BY random()
    LIMIT 1;

    -- Se não encontrou, usar sistema de fallback
    IF v_card.id IS NULL THEN
      FOREACH v_fallback_rarity IN ARRAY v_fallback_rarities LOOP
        SELECT id, name, rarity, atk, def, category, image_url, effects 
        INTO v_card
        FROM cards
        WHERE rarity = v_fallback_rarity
          AND is_active = true
          AND event_id IS NULL
        ORDER BY random()
        LIMIT 1;
        
        IF v_card.id IS NOT NULL THEN
          EXIT; -- Encontrou carta, sair do loop de fallback
        END IF;
      END LOOP;
    END IF;

    -- Adicionar carta ao resultado (se encontrou)
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

  -- Marcar que recebeu starter pack
  UPDATE profiles 
  SET has_received_starter_pack = true 
  WHERE id = p_user_id;

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
$function$;
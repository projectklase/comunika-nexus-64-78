-- Dropar AMBAS as versões da função para eliminar ambiguidade
DROP FUNCTION IF EXISTS public.open_card_pack(uuid, text);
DROP FUNCTION IF EXISTS public.open_card_pack(uuid, text, boolean);

-- Recriar com p_is_free tendo DEFAULT, tornando-o opcional
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
  v_xp_cost INTEGER;
  v_card_count INTEGER;
  v_cards_to_give UUID[] := ARRAY[]::UUID[];
  v_card_id UUID;
  v_profile_record RECORD;
  v_result jsonb;
  v_rarity TEXT;
  v_roll FLOAT;
  v_eligible_cards RECORD;
  v_guaranteed_rare BOOLEAN := false;
  v_has_rare_or_better BOOLEAN := false;
  v_event_id UUID := NULL;
  v_current_school_id UUID;
  v_temp_cards UUID[] := ARRAY[]::UUID[];
  v_i INTEGER;
  v_j INTEGER;
  v_temp UUID;
  v_random_idx INTEGER;
BEGIN
  -- Determinar custo e quantidade baseado no tipo de pacote
  CASE p_pack_type
    WHEN 'basic' THEN
      v_xp_cost := 100;
      v_card_count := 3;
      v_guaranteed_rare := false;
    WHEN 'premium' THEN
      v_xp_cost := 250;
      v_card_count := 5;
      v_guaranteed_rare := true;
    WHEN 'legendary' THEN
      v_xp_cost := 500;
      v_card_count := 5;
      v_guaranteed_rare := true;
    WHEN 'event' THEN
      v_xp_cost := 150;
      v_card_count := 4;
      v_guaranteed_rare := false;
      -- Buscar evento ativo
      SELECT id INTO v_event_id
      FROM card_events
      WHERE is_active = true
        AND starts_at <= NOW()
        AND ends_at >= NOW()
      LIMIT 1;
    ELSE
      RAISE EXCEPTION 'Tipo de pacote inválido: %', p_pack_type;
  END CASE;

  -- Se for pacote grátis (starter pack), não cobra XP
  IF p_is_free THEN
    v_xp_cost := 0;
  END IF;

  -- Buscar perfil e escola atual do usuário
  SELECT p.*, p.current_school_id INTO v_profile_record
  FROM profiles p
  WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  v_current_school_id := v_profile_record.current_school_id;

  -- Verificar XP suficiente (apenas se não for grátis)
  IF NOT p_is_free AND COALESCE(v_profile_record.level_xp, 0) < v_xp_cost THEN
    RAISE EXCEPTION 'XP insuficiente. Necessário: %, Disponível: %', v_xp_cost, COALESCE(v_profile_record.level_xp, 0);
  END IF;

  -- Sortear cartas
  FOR i IN 1..v_card_count LOOP
    v_roll := random();
    
    -- Drop rates REBALANCEADAS por tipo de pacote
    IF p_pack_type = 'legendary' THEN
      -- Pacote Lendário: muito mais chance de lendárias
      IF v_roll < 0.15 THEN
        v_rarity := 'legendary';
        v_has_rare_or_better := true;
      ELSIF v_roll < 0.45 THEN
        v_rarity := 'epic';
        v_has_rare_or_better := true;
      ELSIF v_roll < 0.80 THEN
        v_rarity := 'rare';
        v_has_rare_or_better := true;
      ELSE
        v_rarity := 'common';
      END IF;
    ELSIF p_pack_type = 'premium' THEN
      -- Pacote Premium: boas chances de épicas
      IF v_roll < 0.05 THEN
        v_rarity := 'legendary';
        v_has_rare_or_better := true;
      ELSIF v_roll < 0.25 THEN
        v_rarity := 'epic';
        v_has_rare_or_better := true;
      ELSIF v_roll < 0.60 THEN
        v_rarity := 'rare';
        v_has_rare_or_better := true;
      ELSE
        v_rarity := 'common';
      END IF;
    ELSE
      -- Pacote Básico/Evento: rates padrão
      IF v_roll < 0.02 THEN
        v_rarity := 'legendary';
        v_has_rare_or_better := true;
      ELSIF v_roll < 0.10 THEN
        v_rarity := 'epic';
        v_has_rare_or_better := true;
      ELSIF v_roll < 0.35 THEN
        v_rarity := 'rare';
        v_has_rare_or_better := true;
      ELSE
        v_rarity := 'common';
      END IF;
    END IF;

    -- Buscar carta aleatória da raridade
    IF p_pack_type = 'event' AND v_event_id IS NOT NULL THEN
      -- Para pacotes de evento, buscar cartas do evento
      SELECT id INTO v_card_id
      FROM cards
      WHERE rarity = v_rarity
        AND is_active = true
        AND event_id = v_event_id
        AND (school_id IS NULL OR school_id = v_current_school_id)
      ORDER BY random()
      LIMIT 1;
      
      -- Se não encontrar carta do evento, buscar carta normal
      IF v_card_id IS NULL THEN
        SELECT id INTO v_card_id
        FROM cards
        WHERE rarity = v_rarity
          AND is_active = true
          AND event_id IS NULL
          AND (school_id IS NULL OR school_id = v_current_school_id)
        ORDER BY random()
        LIMIT 1;
      END IF;
    ELSE
      -- Para outros pacotes, buscar cartas normais (sem evento)
      SELECT id INTO v_card_id
      FROM cards
      WHERE rarity = v_rarity
        AND is_active = true
        AND event_id IS NULL
        AND (school_id IS NULL OR school_id = v_current_school_id)
      ORDER BY random()
      LIMIT 1;
    END IF;

    -- Fallback: se não encontrar carta da raridade, buscar qualquer carta
    IF v_card_id IS NULL THEN
      SELECT id INTO v_card_id
      FROM cards
      WHERE is_active = true
        AND (school_id IS NULL OR school_id = v_current_school_id)
      ORDER BY random()
      LIMIT 1;
    END IF;

    IF v_card_id IS NOT NULL THEN
      v_cards_to_give := array_append(v_cards_to_give, v_card_id);
    END IF;
  END LOOP;

  -- Garantia de rara+ para pacotes premium/legendary
  IF v_guaranteed_rare AND NOT v_has_rare_or_better THEN
    -- Forçar uma carta rara ou melhor
    IF p_pack_type = 'legendary' THEN
      -- Para legendary, garantir épica ou melhor
      SELECT id INTO v_card_id
      FROM cards
      WHERE rarity IN ('epic', 'legendary')
        AND is_active = true
        AND event_id IS NULL
        AND (school_id IS NULL OR school_id = v_current_school_id)
      ORDER BY random()
      LIMIT 1;
    ELSE
      -- Para premium, garantir rara ou melhor
      SELECT id INTO v_card_id
      FROM cards
      WHERE rarity IN ('rare', 'epic', 'legendary')
        AND is_active = true
        AND event_id IS NULL
        AND (school_id IS NULL OR school_id = v_current_school_id)
      ORDER BY random()
      LIMIT 1;
    END IF;

    -- Substituir a última carta comum pela garantida
    IF v_card_id IS NOT NULL AND array_length(v_cards_to_give, 1) > 0 THEN
      v_cards_to_give[array_length(v_cards_to_give, 1)] := v_card_id;
    END IF;
  END IF;

  -- Embaralhar array de cartas (Fisher-Yates shuffle)
  v_temp_cards := v_cards_to_give;
  FOR v_i IN REVERSE array_length(v_temp_cards, 1)..2 LOOP
    v_random_idx := 1 + floor(random() * v_i)::INTEGER;
    v_temp := v_temp_cards[v_i];
    v_temp_cards[v_i] := v_temp_cards[v_random_idx];
    v_temp_cards[v_random_idx] := v_temp;
  END LOOP;
  v_cards_to_give := v_temp_cards;

  -- Adicionar cartas ao usuário
  FOREACH v_card_id IN ARRAY v_cards_to_give LOOP
    INSERT INTO user_cards (user_id, card_id, quantity, unlocked_at, unlock_source)
    VALUES (p_user_id, v_card_id, 1, NOW(), 'pack_' || p_pack_type)
    ON CONFLICT (user_id, card_id)
    DO UPDATE SET quantity = user_cards.quantity + 1;
  END LOOP;

  -- Deduzir XP (apenas se não for grátis)
  IF NOT p_is_free AND v_xp_cost > 0 THEN
    UPDATE profiles
    SET level_xp = COALESCE(level_xp, 0) - v_xp_cost,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Registrar histórico do pacote
  INSERT INTO card_packs (user_id, pack_type, cards_received, xp_cost, opened_at)
  VALUES (p_user_id, p_pack_type, v_cards_to_give, v_xp_cost, NOW());

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'cards', to_jsonb(v_cards_to_give),
    'xp_spent', v_xp_cost,
    'pack_type', p_pack_type
  );

  RETURN v_result;
END;
$$;
-- RPC Function para reciclar cartas duplicadas em XP
CREATE OR REPLACE FUNCTION public.recycle_cards(
  p_user_id UUID,
  p_cards JSONB  -- [{card_id: uuid, quantity: number}, ...]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_card RECORD;
  v_card_data RECORD;
  v_owned_quantity INTEGER;
  v_recycle_qty INTEGER;
  v_total_xp INTEGER := 0;
  v_base_xp INTEGER;
  v_cards_recycled INTEGER := 0;
  v_bonus_multiplier NUMERIC := 1.0;
  v_card_entry JSONB;
  v_details JSONB := '[]'::jsonb;
BEGIN
  -- Validar que o array não está vazio
  IF jsonb_array_length(p_cards) = 0 THEN
    RAISE EXCEPTION 'Nenhuma carta selecionada para reciclagem';
  END IF;

  -- Contar total de cartas para calcular bônus de lote
  SELECT SUM((elem->>'quantity')::INTEGER) INTO v_cards_recycled
  FROM jsonb_array_elements(p_cards) elem;

  -- Calcular bônus de lote
  IF v_cards_recycled >= 10 THEN
    v_bonus_multiplier := 1.5;  -- +50% para 10+ cartas
  ELSIF v_cards_recycled >= 5 THEN
    v_bonus_multiplier := 1.25; -- +25% para 5-9 cartas
  END IF;

  -- Processar cada carta
  FOR v_card_entry IN SELECT * FROM jsonb_array_elements(p_cards)
  LOOP
    v_recycle_qty := (v_card_entry->>'quantity')::INTEGER;
    
    -- Buscar quantidade que o usuário possui
    SELECT quantity INTO v_owned_quantity
    FROM user_cards
    WHERE user_id = p_user_id 
      AND card_id = (v_card_entry->>'card_id')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Carta não encontrada na coleção: %', v_card_entry->>'card_id';
    END IF;

    -- Validar que não está reciclando a última cópia
    IF v_owned_quantity - v_recycle_qty < 1 THEN
      RAISE EXCEPTION 'Não é possível reciclar a última cópia de uma carta';
    END IF;

    -- Validar quantidade
    IF v_recycle_qty < 1 OR v_recycle_qty > v_owned_quantity - 1 THEN
      RAISE EXCEPTION 'Quantidade inválida para reciclagem';
    END IF;

    -- Buscar raridade da carta para calcular XP
    SELECT rarity INTO v_card_data
    FROM cards
    WHERE id = (v_card_entry->>'card_id')::UUID;

    -- Calcular XP base por raridade
    CASE v_card_data.rarity
      WHEN 'COMMON' THEN v_base_xp := 5;
      WHEN 'RARE' THEN v_base_xp := 15;
      WHEN 'EPIC' THEN v_base_xp := 50;
      WHEN 'LEGENDARY' THEN v_base_xp := 150;
      WHEN 'SPECIAL' THEN v_base_xp := 200;
      ELSE v_base_xp := 5;
    END CASE;

    -- Adicionar ao total
    v_total_xp := v_total_xp + (v_base_xp * v_recycle_qty);

    -- Registrar detalhes
    v_details := v_details || jsonb_build_object(
      'card_id', v_card_entry->>'card_id',
      'quantity', v_recycle_qty,
      'xp_per_card', v_base_xp,
      'subtotal', v_base_xp * v_recycle_qty
    );

    -- Deduzir cartas do usuário
    UPDATE user_cards
    SET quantity = quantity - v_recycle_qty
    WHERE user_id = p_user_id 
      AND card_id = (v_card_entry->>'card_id')::UUID;
  END LOOP;

  -- Aplicar bônus de lote
  v_total_xp := FLOOR(v_total_xp * v_bonus_multiplier)::INTEGER;

  -- Adicionar XP ao usuário
  UPDATE profiles
  SET total_xp = COALESCE(total_xp, 0) + v_total_xp,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'cards_recycled', v_cards_recycled,
    'base_xp', FLOOR(v_total_xp / v_bonus_multiplier)::INTEGER,
    'bonus_multiplier', v_bonus_multiplier,
    'total_xp', v_total_xp,
    'details', v_details
  );
END;
$function$;
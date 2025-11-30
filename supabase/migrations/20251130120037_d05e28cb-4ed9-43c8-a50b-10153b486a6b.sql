-- ==========================================
-- FASE 1: SISTEMA DE CARTAS COLECIONÁVEIS
-- ==========================================

-- Tabela: cards (Definição de Cartas)
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('MATEMATICA', 'CIENCIAS', 'HISTORIA', 'ARTES', 'ESPORTES', 'ESPECIAL')),
  rarity TEXT NOT NULL CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  atk INTEGER NOT NULL DEFAULT 10,
  def INTEGER NOT NULL DEFAULT 10,
  effects JSONB DEFAULT '[]',
  image_url TEXT,
  image_prompt TEXT,
  required_level INTEGER DEFAULT 1,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cards_rarity ON cards(rarity);
CREATE INDEX idx_cards_category ON cards(category);
CREATE INDEX idx_cards_school_id ON cards(school_id);

-- Tabela: user_cards (Coleção do Aluno)
CREATE TABLE public.user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  unlock_source TEXT DEFAULT 'PACK' CHECK (unlock_source IN ('PACK', 'REWARD', 'EVENT', 'TRADE')),
  UNIQUE(user_id, card_id)
);

CREATE INDEX idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX idx_user_cards_card_id ON user_cards(card_id);

-- Tabela: decks (Decks do Aluno)
CREATE TABLE public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  card_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_decks_user_id ON decks(user_id);

-- Tabela: card_packs (Histórico de Pacotes Abertos)
CREATE TABLE public.card_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pack_type TEXT NOT NULL CHECK (pack_type IN ('BASIC', 'RARE', 'EPIC', 'LEGENDARY')),
  cards_received UUID[] NOT NULL,
  xp_cost INTEGER DEFAULT 0,
  opened_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_card_packs_user_id ON card_packs(user_id);

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- CARDS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active cards" ON cards
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage cards" ON cards
  FOR ALL USING (has_role(auth.uid(), 'administrador'));

-- USER_CARDS
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards" ON user_cards
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert user cards" ON user_cards
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can update user cards" ON user_cards
  FOR UPDATE USING (user_id = auth.uid());

-- DECKS
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own decks" ON decks
  FOR ALL USING (user_id = auth.uid());

-- CARD_PACKS
ALTER TABLE card_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pack history" ON card_packs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert pack history" ON card_packs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ==========================================
-- RPC: open_card_pack (Sistema Gacha)
-- ==========================================

CREATE OR REPLACE FUNCTION public.open_card_pack(
  p_user_id UUID,
  p_pack_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cards_to_give INTEGER;
  v_card_id UUID;
  v_result_cards UUID[] := '{}';
  v_rarity TEXT;
  v_roll NUMERIC;
  v_user_xp INTEGER;
  v_xp_cost INTEGER;
  v_user_level INTEGER;
BEGIN
  -- Definir custo de XP e quantidade de cartas por tipo de pacote
  CASE p_pack_type
    WHEN 'BASIC' THEN
      v_xp_cost := 100;
      v_cards_to_give := 3;
    WHEN 'RARE' THEN
      v_xp_cost := 500;
      v_cards_to_give := 5;
    WHEN 'EPIC' THEN
      v_xp_cost := 1500;
      v_cards_to_give := 5;
    WHEN 'LEGENDARY' THEN
      v_xp_cost := 5000;
      v_cards_to_give := 7;
    ELSE
      RAISE EXCEPTION 'Tipo de pacote inválido: %', p_pack_type;
  END CASE;

  -- Verificar XP do usuário
  SELECT COALESCE(total_xp, 0) INTO v_user_xp FROM profiles WHERE id = p_user_id;
  
  IF v_user_xp < v_xp_cost THEN
    RAISE EXCEPTION 'XP insuficiente. Necessário: %, Disponível: %', v_xp_cost, v_user_xp;
  END IF;

  -- Calcular nível do usuário (100 XP por nível)
  v_user_level := GREATEST(1, FLOOR(v_user_xp / 100));

  -- Descontar XP
  UPDATE profiles SET total_xp = total_xp - v_xp_cost WHERE id = p_user_id;

  -- Sortear cartas
  FOR i IN 1..v_cards_to_give LOOP
    v_roll := random();
    
    -- Probabilidades baseadas no tipo de pacote
    CASE p_pack_type
      WHEN 'BASIC' THEN
        IF v_roll < 0.70 THEN v_rarity := 'COMMON';
        ELSIF v_roll < 0.95 THEN v_rarity := 'RARE';
        ELSIF v_roll < 0.99 THEN v_rarity := 'EPIC';
        ELSE v_rarity := 'LEGENDARY';
        END IF;
      WHEN 'RARE' THEN
        IF v_roll < 0.40 THEN v_rarity := 'COMMON';
        ELSIF v_roll < 0.85 THEN v_rarity := 'RARE';
        ELSIF v_roll < 0.97 THEN v_rarity := 'EPIC';
        ELSE v_rarity := 'LEGENDARY';
        END IF;
      WHEN 'EPIC' THEN
        IF v_roll < 0.20 THEN v_rarity := 'COMMON';
        ELSIF v_roll < 0.60 THEN v_rarity := 'RARE';
        ELSIF v_roll < 0.92 THEN v_rarity := 'EPIC';
        ELSE v_rarity := 'LEGENDARY';
        END IF;
      WHEN 'LEGENDARY' THEN
        IF v_roll < 0.10 THEN v_rarity := 'COMMON';
        ELSIF v_roll < 0.40 THEN v_rarity := 'RARE';
        ELSIF v_roll < 0.80 THEN v_rarity := 'EPIC';
        ELSE v_rarity := 'LEGENDARY';
        END IF;
    END CASE;

    -- Selecionar carta aleatória da raridade
    SELECT id INTO v_card_id
    FROM cards
    WHERE rarity = v_rarity
      AND is_active = true
      AND required_level <= v_user_level
    ORDER BY random()
    LIMIT 1;

    IF v_card_id IS NOT NULL THEN
      v_result_cards := array_append(v_result_cards, v_card_id);
      
      -- Adicionar à coleção do usuário
      INSERT INTO user_cards (user_id, card_id, quantity, unlock_source)
      VALUES (p_user_id, v_card_id, 1, 'PACK')
      ON CONFLICT (user_id, card_id) 
      DO UPDATE SET quantity = user_cards.quantity + 1;
    END IF;
  END LOOP;

  -- Registrar histórico do pacote
  INSERT INTO card_packs (user_id, pack_type, cards_received, xp_cost)
  VALUES (p_user_id, p_pack_type, v_result_cards, v_xp_cost);

  -- Retornar resultado com detalhes das cartas
  RETURN jsonb_build_object(
    'success', true,
    'pack_type', p_pack_type,
    'xp_spent', v_xp_cost,
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

-- ==========================================
-- SEED DATA: 30 Cartas Iniciais
-- ==========================================

-- MATEMÁTICA (10 cartas)
INSERT INTO cards (name, description, category, rarity, atk, def, effects, required_level, image_url) VALUES
('Calculadora Básica', 'Ferramenta essencial para cálculos rápidos', 'MATEMATICA', 'COMMON', 8, 8, '[]', 1, NULL),
('Régua Dourada', 'Mede com precisão milimétrica', 'MATEMATICA', 'COMMON', 10, 6, '[]', 1, NULL),
('Compasso Arcano', 'Desenha círculos perfeitos', 'MATEMATICA', 'COMMON', 7, 9, '[]', 1, NULL),
('Transferidor Místico', 'Domina todos os ângulos', 'MATEMATICA', 'COMMON', 9, 7, '[]', 1, NULL),
('Equação Flamejante', 'Resolve problemas com velocidade', 'MATEMATICA', 'RARE', 18, 15, '[{"type": "BOOST", "value": 1.3, "description": "Aumenta ATK em 30% por 1 turno"}]', 3, NULL),
('Fórmula Mágica', 'X sempre encontra sua solução', 'MATEMATICA', 'RARE', 16, 18, '[{"type": "SHIELD", "value": 1, "description": "Protege linha por 1 turno"}]', 3, NULL),
('Geometria Sagrada', 'O poder das formas perfeitas', 'MATEMATICA', 'RARE', 20, 14, '[{"type": "BURN", "value": 1, "description": "Remove carta mais fraca do oponente"}]', 4, NULL),
('Teorema de Pitágoras', 'Triângulos revelam seus segredos', 'MATEMATICA', 'EPIC', 28, 28, '[{"type": "BOOST", "value": 1.5, "description": "+50% ATK"}, {"type": "SHIELD", "value": 2, "description": "Proteção por 2 turnos"}]', 8, NULL),
('Álgebra Suprema', 'Variáveis dançam ao seu comando', 'MATEMATICA', 'EPIC', 32, 24, '[{"type": "DOUBLE", "value": 2, "description": "Dobra poder de 1 carta aliada"}, {"type": "BURN", "value": 1, "description": "Remove carta inimiga"}]', 10, NULL),
('Einstein da Matemática', 'E=mc² do conhecimento', 'MATEMATICA', 'LEGENDARY', 45, 40, '[{"type": "BOOST", "value": 2, "description": "Dobra ATK"}, {"type": "SHIELD", "value": 3, "description": "Escudo triplo"}, {"type": "BURN", "value": 2, "description": "Remove 2 cartas inimigas"}]', 15, NULL);

-- CIÊNCIAS (10 cartas)
INSERT INTO cards (name, description, category, rarity, atk, def, effects, required_level, image_url) VALUES
('Tubo de Ensaio', 'Recipiente de experimentos', 'CIENCIAS', 'COMMON', 7, 10, '[]', 1, NULL),
('Microscópio Básico', 'Revela o mundo invisível', 'CIENCIAS', 'COMMON', 9, 8, '[]', 1, NULL),
('Béquer Cristalino', 'Mede líquidos com precisão', 'CIENCIAS', 'COMMON', 8, 9, '[]', 1, NULL),
('Pipeta Mágica', 'Transfere substâncias com maestria', 'CIENCIAS', 'COMMON', 10, 7, '[]', 1, NULL),
('DNA Mutante', 'Cadeia dupla de poder', 'CIENCIAS', 'RARE', 19, 16, '[{"type": "HEAL", "value": 5, "description": "Regenera 5 de DEF"}]', 3, NULL),
('Átomo Brilhante', 'Núcleo de energia pura', 'CIENCIAS', 'RARE', 17, 19, '[{"type": "SHIELD", "value": 1, "description": "Proteção atômica"}]', 3, NULL),
('Tabela Periódica', 'Todos os elementos ao seu dispor', 'CIENCIAS', 'RARE', 15, 20, '[{"type": "FREEZE", "value": 1, "description": "Congela 1 carta inimiga"}]', 4, NULL),
('Reação Explosiva', 'Química em seu ponto máximo', 'CIENCIAS', 'EPIC', 30, 26, '[{"type": "BURN", "value": 2, "description": "Explosão destrói 2 cartas"}, {"type": "BOOST", "value": 1.4, "description": "+40% ATK"}]', 8, NULL),
('Big Bang Científico', 'A origem do universo em suas mãos', 'CIENCIAS', 'EPIC', 28, 30, '[{"type": "DOUBLE", "value": 2, "description": "Dobra linha inteira"}, {"type": "SHIELD", "value": 2, "description": "Escudo cósmico"}]', 10, NULL),
('Newton Galáctico', 'Gravidade, luz e movimento', 'CIENCIAS', 'LEGENDARY', 42, 44, '[{"type": "BOOST", "value": 2.5, "description": "ATK x2.5"}, {"type": "FREEZE", "value": 3, "description": "Congela linha inimiga"}, {"type": "HEAL", "value": 10, "description": "Cura massiva"}]', 15, NULL);

-- HISTÓRIA (10 cartas)
INSERT INTO cards (name, description, category, rarity, atk, def, effects, required_level, image_url) VALUES
('Pergaminho Antigo', 'Sabedoria dos ancestrais', 'HISTORIA', 'COMMON', 6, 11, '[]', 1, NULL),
('Espada Medieval', 'Lâmina dos cavaleiros', 'HISTORIA', 'COMMON', 11, 6, '[]', 1, NULL),
('Escudo de Madeira', 'Proteção básica de guerra', 'HISTORIA', 'COMMON', 5, 12, '[]', 1, NULL),
('Capacete Romano', 'Defesa do império', 'HISTORIA', 'COMMON', 8, 10, '[]', 1, NULL),
('Escudo Medieval', 'Brasão de família nobre', 'HISTORIA', 'RARE', 14, 21, '[{"type": "SHIELD", "value": 2, "description": "Defesa fortificada"}]', 3, NULL),
('Coroa Real', 'Símbolo de poder monárquico', 'HISTORIA', 'RARE', 18, 17, '[{"type": "BOOST", "value": 1.3, "description": "Autoridade real"}]', 3, NULL),
('Lança Espartana', 'Arma dos 300 guerreiros', 'HISTORIA', 'RARE', 21, 13, '[{"type": "BURN", "value": 1, "description": "Ataque letal"}]', 4, NULL),
('Faraó Místico', 'Senhor das pirâmides', 'HISTORIA', 'EPIC', 26, 31, '[{"type": "SHIELD", "value": 3, "description": "Proteção dos deuses"}, {"type": "HEAL", "value": 8, "description": "Regeneração eterna"}]', 8, NULL),
('Samurai Lendário', 'Código bushido incarnado', 'HISTORIA', 'EPIC', 33, 27, '[{"type": "BOOST", "value": 1.8, "description": "+80% ATK"}, {"type": "BURN", "value": 2, "description": "Corte duplo"}]', 10, NULL),
('César Imortal', 'Imperador de Roma eterna', 'HISTORIA', 'LEGENDARY', 48, 42, '[{"type": "DOUBLE", "value": 3, "description": "Triplica poder de aliados"}, {"type": "SHIELD", "value": 4, "description": "Legião invencível"}, {"type": "BOOST", "value": 2, "description": "Dobra ATK"}]', 15, NULL);
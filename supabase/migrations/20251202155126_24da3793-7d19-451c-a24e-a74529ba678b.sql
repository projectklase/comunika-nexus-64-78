-- =====================================================
-- EXPANSÃO MASSIVA DE CARTAS - 64 NOVAS CARTAS
-- =====================================================

-- =====================================================
-- CATEGORIA: ARTES (20 cartas)
-- =====================================================

-- ARTES - COMMON (8 cartas) - Level 1
INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Pincel Encantado', 'Pinta realidades mágicas com cores vivas', 'ARTES', 'COMMON', 'MONSTER', 9, 8, 1, '[]', true),
('Lápis Colorido', 'Desenha sonhos em papel com traços precisos', 'ARTES', 'COMMON', 'MONSTER', 7, 10, 1, '[]', true),
('Paleta Cromática', 'Mistura cores infinitas criando harmonia', 'ARTES', 'COMMON', 'MONSTER', 8, 9, 1, '[]', true),
('Nota Musical', 'Ressoa melodias ancestrais pelo ar', 'ARTES', 'COMMON', 'MONSTER', 10, 7, 1, '[]', true),
('Escultor de Argila', 'Molda formas da natureza com suas mãos', 'ARTES', 'COMMON', 'MONSTER', 6, 11, 1, '[]', true),
('Máscara Teatral', 'Oculta verdades e revela emoções profundas', 'ARTES', 'COMMON', 'MONSTER', 8, 8, 1, '[]', true),
('Tela em Branco', 'Potencial ilimitado de criação artística', 'ARTES', 'COMMON', 'MONSTER', 5, 12, 1, '[]', true),
('Flauta Doce', 'Encanta com melodias suaves e hipnóticas', 'ARTES', 'COMMON', 'MONSTER', 11, 6, 1, '[]', true);

-- ARTES - RARE (6 cartas) - Level 3-4
INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Van Gogh Girassol', 'Regenera através da beleza das flores douradas', 'ARTES', 'RARE', 'MONSTER', 18, 16, 3, '[{"type": "HEAL", "value": 5, "description": "Cura 5 HP com a beleza da arte"}]', true),
('Piano Fantasma', 'Paralisa inimigos com notas graves e sombrias', 'ARTES', 'RARE', 'MONSTER', 16, 19, 4, '[{"type": "FREEZE", "value": 1, "description": "Congela por 1 turno"}]', true),
('Grafiteiro Urbano', 'Ataca com spray corrosivo das ruas', 'ARTES', 'RARE', 'MONSTER', 20, 14, 3, '[{"type": "BURN", "value": 1, "description": "Causa 1 de dano por turno"}]', true),
('Violino Sombrio', 'Melodia inspiradora que fortalece aliados', 'ARTES', 'RARE', 'MONSTER', 19, 17, 4, '[{"type": "BOOST", "value": 1.3, "description": "Aumenta ATK em 30%"}]', true),
('Dançarina Flamenca', 'Paixão ardente que inflama o combate', 'ARTES', 'RARE', 'MONSTER', 21, 13, 4, '[{"type": "BOOST", "value": 1.4, "description": "Aumenta ATK em 40%"}]', true),
('Origami Dragão', 'Dobras de papel que formam proteção mística', 'ARTES', 'RARE', 'MONSTER', 15, 20, 3, '[{"type": "SHIELD", "value": 2, "description": "Reduz 2 de dano recebido"}]', true);

-- ARTES - EPIC (4 cartas) - Level 8-10
INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Michelangelo Celestial', 'Mestre renascentista com poder divino', 'ARTES', 'EPIC', 'MONSTER', 30, 28, 8, '[{"type": "DOUBLE", "value": 2, "description": "Dobra dano do próximo ataque"}, {"type": "SHIELD", "value": 2, "description": "Reduz 2 de dano recebido"}]', true),
('Beethoven Trovão', 'Sinfonia devastadora que ecoa pelos céus', 'ARTES', 'EPIC', 'MONSTER', 32, 25, 9, '[{"type": "BURN", "value": 2, "description": "Causa 2 de dano por turno"}, {"type": "BOOST", "value": 1.5, "description": "Aumenta ATK em 50%"}]', true),
('Frida Kahlo Espiritual', 'Dor transformada em força artística', 'ARTES', 'EPIC', 'MONSTER', 27, 31, 10, '[{"type": "HEAL", "value": 10, "description": "Cura 10 HP"}, {"type": "REFLECT", "value": 0.5, "description": "Reflete 50% do dano"}]', true),
('Maestro do Caos', 'Rege o tempo e espaço com sua batuta', 'ARTES', 'EPIC', 'MONSTER', 29, 27, 9, '[{"type": "FREEZE", "value": 2, "description": "Congela por 2 turnos"}, {"type": "BOOST", "value": 1.4, "description": "Aumenta ATK em 40%"}]', true);

-- ARTES - LEGENDARY (2 cartas) - Level 15
INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Leonardo da Vinci Supremo', 'Gênio universal que domina todas as artes', 'ARTES', 'LEGENDARY', 'MONSTER', 46, 42, 15, '[{"type": "DOUBLE", "value": 3, "description": "Tripla dano do próximo ataque"}, {"type": "BOOST", "value": 2, "description": "Dobra ATK"}, {"type": "HEAL", "value": 15, "description": "Cura 15 HP"}]', true),
('Mozart Imortal', 'Melodia eterna que transcende o tempo', 'ARTES', 'LEGENDARY', 'MONSTER', 44, 45, 15, '[{"type": "FREEZE", "value": 3, "description": "Congela por 3 turnos"}, {"type": "SHIELD", "value": 4, "description": "Reduz 4 de dano recebido"}, {"type": "BOOST", "value": 1.8, "description": "Aumenta ATK em 80%"}]', true);

-- =====================================================
-- CATEGORIA: ESPORTES (20 cartas)
-- =====================================================

-- ESPORTES - COMMON (8 cartas) - Level 1
INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Bola de Futebol', 'Rola com energia infinita pelo campo', 'ESPORTES', 'COMMON', 'MONSTER', 10, 7, 1, '[]', true),
('Raquete Veloz', 'Rebate qualquer ataque com precisão', 'ESPORTES', 'COMMON', 'MONSTER', 9, 8, 1, '[]', true),
('Tênis Saltador', 'Agilidade sobrenatural em cada passo', 'ESPORTES', 'COMMON', 'MONSTER', 11, 6, 1, '[]', true),
('Luva de Boxe', 'Golpe potente e direto ao alvo', 'ESPORTES', 'COMMON', 'MONSTER', 12, 5, 1, '[]', true),
('Haltere de Bronze', 'Força bruta concentrada em metal', 'ESPORTES', 'COMMON', 'MONSTER', 6, 11, 1, '[]', true),
('Arco e Flecha', 'Precisão de caçador milenar', 'ESPORTES', 'COMMON', 'MONSTER', 8, 9, 1, '[]', true),
('Skate Radical', 'Manobras impossíveis sobre rodas', 'ESPORTES', 'COMMON', 'MONSTER', 10, 7, 1, '[]', true),
('Bicicleta Turbo', 'Velocidade sobre duas rodas', 'ESPORTES', 'COMMON', 'MONSTER', 7, 10, 1, '[]', true);

-- ESPORTES - RARE (6 cartas) - Level 3-4
INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Goleiro Fantasma', 'Defesa impenetrável entre as traves', 'ESPORTES', 'RARE', 'MONSTER', 14, 21, 3, '[{"type": "SHIELD", "value": 2, "description": "Reduz 2 de dano recebido"}]', true),
('Nadador Olímpico', 'Velocidade aquática incomparável', 'ESPORTES', 'RARE', 'MONSTER', 19, 16, 4, '[{"type": "BOOST", "value": 1.3, "description": "Aumenta ATK em 30%"}]', true),
('Ginasta Acrobata', 'Flexibilidade que cura o corpo', 'ESPORTES', 'RARE', 'MONSTER', 17, 18, 3, '[{"type": "HEAL", "value": 5, "description": "Cura 5 HP com movimento"}]', true),
('Lutador de Sumô', 'Peso devastador que esmaga oponentes', 'ESPORTES', 'RARE', 'MONSTER', 15, 20, 4, '[{"type": "SHIELD", "value": 1, "description": "Reduz 1 de dano"}, {"type": "BURN", "value": 1, "description": "Causa 1 de dano por turno"}]', true),
('Arqueiro Zen', 'Flecha certeira guiada pela meditação', 'ESPORTES', 'RARE', 'MONSTER', 21, 14, 4, '[{"type": "BURN", "value": 1, "description": "Causa 1 de dano por turno"}]', true),
('Skatista Lendário', 'Adrenalina pura nas manobras radicais', 'ESPORTES', 'RARE', 'MONSTER', 20, 15, 3, '[{"type": "BOOST", "value": 1.4, "description": "Aumenta ATK em 40%"}]', true);

-- ESPORTES - EPIC (4 cartas) - Level 8-10
INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Pelé do Trovão', 'O rei do futebol com poder de tempestade', 'ESPORTES', 'EPIC', 'MONSTER', 33, 24, 8, '[{"type": "BURN", "value": 2, "description": "Causa 2 de dano por turno"}, {"type": "BOOST", "value": 1.6, "description": "Aumenta ATK em 60%"}]', true),
('Usain Bolt Relâmpago', 'Mais rápido que a própria luz', 'ESPORTES', 'EPIC', 'MONSTER', 31, 26, 9, '[{"type": "DOUBLE", "value": 2, "description": "Dobra dano do próximo ataque"}, {"type": "BOOST", "value": 1.5, "description": "Aumenta ATK em 50%"}]', true),
('Muhammad Ali Invicto', 'Flutua como borboleta, ferroa como abelha', 'ESPORTES', 'EPIC', 'MONSTER', 29, 30, 10, '[{"type": "SHIELD", "value": 3, "description": "Reduz 3 de dano recebido"}, {"type": "BURN", "value": 1, "description": "Causa 1 de dano por turno"}]', true),
('Michael Jordan Celestial', 'Voo impossível rumo à cesta', 'ESPORTES', 'EPIC', 'MONSTER', 32, 27, 9, '[{"type": "BOOST", "value": 2, "description": "Dobra ATK"}, {"type": "HEAL", "value": 8, "description": "Cura 8 HP"}]', true);

-- ESPORTES - LEGENDARY (2 cartas) - Level 15
INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Hércules Olímpico', 'Força dos deuses gregos em forma mortal', 'ESPORTES', 'LEGENDARY', 'MONSTER', 48, 40, 15, '[{"type": "BOOST", "value": 2.5, "description": "Aumenta ATK em 150%"}, {"type": "BURN", "value": 3, "description": "Causa 3 de dano por turno"}, {"type": "SHIELD", "value": 3, "description": "Reduz 3 de dano recebido"}]', true),
('Maratonista Imortal', 'Resistência infinita que nunca para', 'ESPORTES', 'LEGENDARY', 'MONSTER', 42, 46, 15, '[{"type": "HEAL", "value": 15, "description": "Cura 15 HP"}, {"type": "SHIELD", "value": 4, "description": "Reduz 4 de dano recebido"}, {"type": "DOUBLE", "value": 2, "description": "Dobra dano do próximo ataque"}]', true);

-- =====================================================
-- EXPANSÃO: MATEMÁTICA (+6 cartas)
-- =====================================================

INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Ábaco Milenar', 'Instrumento ancestral de cálculo perfeito', 'MATEMATICA', 'COMMON', 'MONSTER', 8, 9, 1, '[]', true),
('Cubo Mágico', 'Puzzle tridimensional de infinitas combinações', 'MATEMATICA', 'COMMON', 'MONSTER', 9, 8, 1, '[]', true),
('Fração Quebradiça', 'Divide e conquista com precisão numérica', 'MATEMATICA', 'RARE', 'MONSTER', 17, 17, 3, '[{"type": "BURN", "value": 1, "description": "Causa 1 de dano por turno"}]', true),
('Integral Infinita', 'Acumula poder ao longo do tempo', 'MATEMATICA', 'RARE', 'MONSTER', 19, 15, 4, '[{"type": "BOOST", "value": 1.3, "description": "Aumenta ATK em 30%"}]', true),
('Fibonacci Espiral', 'Padrão natural de crescimento perfeito', 'MATEMATICA', 'EPIC', 'MONSTER', 28, 29, 9, '[{"type": "DOUBLE", "value": 2, "description": "Dobra dano do próximo ataque"}, {"type": "HEAL", "value": 6, "description": "Cura 6 HP"}]', true),
('Gauss Dimensional', 'Gênio matemático que dobra a realidade', 'MATEMATICA', 'LEGENDARY', 'MONSTER', 44, 43, 15, '[{"type": "BOOST", "value": 2.2, "description": "Aumenta ATK em 120%"}, {"type": "FREEZE", "value": 3, "description": "Congela por 3 turnos"}, {"type": "SHIELD", "value": 3, "description": "Reduz 3 de dano recebido"}]', true);

-- =====================================================
-- EXPANSÃO: CIÊNCIAS (+6 cartas)
-- =====================================================

INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Célula Primordial', 'Origem de toda vida conhecida', 'CIENCIAS', 'COMMON', 'MONSTER', 7, 10, 1, '[]', true),
('Ímã Polar', 'Atrai e repele com força magnética', 'CIENCIAS', 'COMMON', 'MONSTER', 10, 7, 1, '[]', true),
('Vulcão Adormecido', 'Erupção devastadora aguarda despertar', 'CIENCIAS', 'RARE', 'MONSTER', 20, 15, 4, '[{"type": "BURN", "value": 2, "description": "Causa 2 de dano por turno"}]', true),
('Buraco Negro', 'Gravidade infinita que tudo consome', 'CIENCIAS', 'RARE', 'MONSTER', 14, 21, 3, '[{"type": "FREEZE", "value": 2, "description": "Congela por 2 turnos"}]', true),
('Marie Curie Radiante', 'Brilha com energia radioativa poderosa', 'CIENCIAS', 'EPIC', 'MONSTER', 31, 26, 10, '[{"type": "BURN", "value": 2, "description": "Causa 2 de dano por turno"}, {"type": "HEAL", "value": 8, "description": "Cura 8 HP"}]', true),
('Darwin Evolucionário', 'Adapta-se e evolui a cada batalha', 'CIENCIAS', 'LEGENDARY', 'MONSTER', 43, 44, 15, '[{"type": "DOUBLE", "value": 3, "description": "Tripla dano do próximo ataque"}, {"type": "BOOST", "value": 1.8, "description": "Aumenta ATK em 80%"}, {"type": "HEAL", "value": 12, "description": "Cura 12 HP"}]', true);

-- =====================================================
-- EXPANSÃO: HISTÓRIA (+6 cartas)
-- =====================================================

INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Vaso Grego', 'Relíquia antiga com sabedoria milenar', 'HISTORIA', 'COMMON', 'MONSTER', 6, 11, 1, '[]', true),
('Moeda Antiga', 'Tesouro de civilizações perdidas', 'HISTORIA', 'COMMON', 'MONSTER', 8, 8, 1, '[]', true),
('Viking Berserker', 'Fúria nórdica em batalha sangrenta', 'HISTORIA', 'RARE', 'MONSTER', 21, 14, 4, '[{"type": "BURN", "value": 1, "description": "Causa 1 de dano por turno"}, {"type": "BOOST", "value": 1.2, "description": "Aumenta ATK em 20%"}]', true),
('Gladiador Romano', 'Guerreiro da arena com escudo invicto', 'HISTORIA', 'RARE', 'MONSTER', 18, 17, 3, '[{"type": "SHIELD", "value": 1, "description": "Reduz 1 de dano recebido"}]', true),
('Cleópatra Encantadora', 'Rainha do Egito com poderes místicos', 'HISTORIA', 'EPIC', 'MONSTER', 27, 30, 9, '[{"type": "FREEZE", "value": 2, "description": "Congela por 2 turnos"}, {"type": "HEAL", "value": 10, "description": "Cura 10 HP"}]', true),
('Alexandre o Grande', 'Conquistador invencível do mundo antigo', 'HISTORIA', 'LEGENDARY', 'MONSTER', 47, 41, 15, '[{"type": "BOOST", "value": 2.5, "description": "Aumenta ATK em 150%"}, {"type": "BURN", "value": 2, "description": "Causa 2 de dano por turno"}, {"type": "DOUBLE", "value": 2, "description": "Dobra dano do próximo ataque"}]', true);

-- =====================================================
-- EXPANSÃO: ESPECIAL (+6 cartas - Traps e Spells)
-- =====================================================

INSERT INTO cards (name, description, category, rarity, card_type, atk, def, required_level, effects, is_active) VALUES
('Armadilha de Espinhos', 'Espinhos afiados que ferem quem ataca', 'ESPECIAL', 'COMMON', 'TRAP', 0, 5, 1, '[{"type": "BURN", "value": 5, "description": "Causa 5 de dano fixo ao atacante"}]', true),
('Barreira Mística', 'Escudo mágico que protege seu monstro', 'ESPECIAL', 'COMMON', 'TRAP', 0, 8, 1, '[{"type": "SHIELD", "value": 1, "description": "Reduz 1 de dano recebido"}]', true),
('Veneno Lento', 'Toxina que corrói ao longo do tempo', 'ESPECIAL', 'RARE', 'TRAP', 0, 6, 2, '[{"type": "BURN", "value": 1, "description": "Causa 1 de dano por 3 turnos"}]', true),
('Roubo de Energia', 'Drena vida do oponente para você', 'ESPECIAL', 'RARE', 'SPELL', 0, 4, 3, '[{"type": "HEAL", "value": 8, "description": "Cura 8 HP roubando energia"}]', true),
('Sacrifício Heroico', 'Sacrifica defesa por ataque devastador', 'ESPECIAL', 'EPIC', 'SPELL', 0, 0, 5, '[{"type": "BOOST", "value": 2, "description": "Dobra ATK do seu monstro"}]', true),
('Portal Dimensional', 'Reflete todo dano de volta ao atacante', 'ESPECIAL', 'LEGENDARY', 'TRAP', 0, 10, 10, '[{"type": "REFLECT", "value": 1, "description": "Reflete 100% do dano recebido"}]', true);
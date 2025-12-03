-- Atualizar image_url das 4 cartas de MATEMATICA que faltavam imagem
UPDATE cards SET image_url = '/cards/matematica/Abaco_Milenar_COMMON.png' WHERE name = 'Ábaco Milenar';
UPDATE cards SET image_url = '/cards/matematica/Cubo_Magico_COMMON.png' WHERE name = 'Cubo Mágico';
UPDATE cards SET image_url = '/cards/matematica/Fracao_Quebradica_RARE.png' WHERE name = 'Fração Quebradiça';
UPDATE cards SET image_url = '/cards/matematica/Integral_Infinita_RARE.png' WHERE name = 'Integral Infinita';
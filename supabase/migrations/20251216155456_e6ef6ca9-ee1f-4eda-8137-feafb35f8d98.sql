-- Habilitar REPLICA IDENTITY FULL para capturar todos os dados nas mudanças
ALTER TABLE schools REPLICA IDENTITY FULL;

-- Adicionar tabela schools à publication de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE schools;
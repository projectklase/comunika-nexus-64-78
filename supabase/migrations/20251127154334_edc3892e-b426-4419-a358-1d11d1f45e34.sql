-- Preencher school_id em entregas existentes baseado no post relacionado
UPDATE deliveries d
SET school_id = p.school_id
FROM posts p
WHERE d.post_id = p.id::text
AND d.school_id IS NULL;

-- Criar índice para melhor performance em queries filtradas por school_id
CREATE INDEX IF NOT EXISTS idx_deliveries_school_id ON deliveries(school_id);

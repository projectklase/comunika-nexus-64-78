-- Adicionar coluna program_id à tabela levels para vincular níveis a programas
ALTER TABLE public.levels
ADD COLUMN program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

-- Criar índice para otimizar queries de filtragem
CREATE INDEX idx_levels_program_id ON public.levels(program_id);

-- Comentário para documentação
COMMENT ON COLUMN public.levels.program_id IS 'Vincula o nível a um programa específico (ex: Inglês, Espanhol, Futebol)';

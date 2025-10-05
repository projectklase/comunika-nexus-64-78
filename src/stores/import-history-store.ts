import { supabase } from '@/integrations/supabase/client'; // Ajuste o caminho se for diferente
import type { ImportRecord, ImportHistoryFilters } from '@/types/import';

/**
 * Adiciona um novo registro de importação no Supabase.
 * Esta função deve ser chamada quando uma importação começa.
 * @param recordData Os dados iniciais do registro de importação.
 * @returns O registro completo criado no banco de dados.
 */
export const addImportRecord = async (
  recordData: Omit<ImportRecord, 'id' | 'importedAt' | 'createdAt'>
): Promise<ImportRecord> => {
  const { data, error } = await supabase
    .from('import_history')
    .insert({
      ...recordData,
      // Mapeia os nomes para snake_case do banco de dados
      file_name: recordData.fileName,
      import_type: recordData.type,
      rows_processed: recordData.rowsProcessed,
      imported_by: recordData.importedBy,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao adicionar registro de importação:', error);
    throw error;
  }

  // Mapeia de volta para camelCase para o frontend
  return {
    ...data,
    fileName: data.file_name,
    type: data.import_type,
    rowsProcessed: data.rows_processed,
    rowsSucceeded: data.rows_succeeded,
    rowsFailed: data.rows_failed,
    errorLog: data.error_log,
    importedBy: data.imported_by,
    importedAt: data.created_at, // O campo 'importedAt' do seu tipo corresponde ao 'created_at' do banco
  } as ImportRecord;
};

/**
 * Atualiza um registro de importação existente, geralmente ao finalizar o processo.
 * @param id O ID do registro de importação a ser atualizado.
 * @param updates Os campos a serem atualizados (ex: status, contagem de linhas).
 */
export const updateImportRecord = async (id: string, updates: Partial<ImportRecord>): Promise<void> => {
  const { error } = await supabase
    .from('import_history')
    .update({
      // Mapeia os nomes para snake_case do banco de dados
      status: updates.status,
      rows_processed: updates.rowsProcessed,
      rows_succeeded: updates.rowsSucceeded,
      rows_failed: updates.rowsFailed,
      error_log: updates.errorLog,
    })
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar registro de importação:', error);
    throw error;
  }
};

/**
 * Busca e filtra o histórico de importações do Supabase.
 * @param filters Filtros de busca e tipo.
 * @returns Uma lista de registros de importação.
 */
export const getFilteredHistory = async (filters?: ImportHistoryFilters): Promise<ImportRecord[]> => {
  let query = supabase
    .from('import_history')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.ilike('file_name', `%${filters.search}%`);
  }

  if (filters?.type) {
    query = query.eq('import_type', filters.type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar histórico de importações:', error);
    throw error;
  }

  // Mapeia os resultados de volta para camelCase para o frontend
  return data.map(item => ({
    ...item,
    fileName: item.file_name,
    type: item.import_type,
    rowsProcessed: item.rows_processed,
    rowsSucceeded: item.rows_succeeded,
    rowsFailed: item.rows_failed,
    errorLog: item.error_log,
    importedBy: item.imported_by,
    importedAt: item.created_at,
  })) as ImportRecord[];
};
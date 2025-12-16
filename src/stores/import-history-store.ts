import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { ImportRecord, ImportHistoryFilters } from '@/types/import';

interface ImportHistoryState {
  history: ImportRecord[];
  filters: ImportHistoryFilters;
  isLoading: boolean;
  error: string | null;
}

interface ImportHistoryActions {
  loadHistory: (schoolId: string) => Promise<void>;
  addRecord: (record: Omit<ImportRecord, 'id' | 'createdAt'>) => Promise<ImportRecord>;
  updateRecord: (id: string, updates: Partial<ImportRecord>) => Promise<void>;
  setFilters: (filters: ImportHistoryFilters) => void;
  getFilteredHistory: () => ImportRecord[];
}

export const useImportHistoryStore = create<ImportHistoryState & ImportHistoryActions>((set, get) => ({
  history: [],
  filters: { search: '' },
  isLoading: false,
  error: null,

  loadHistory: async (schoolId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await (supabase as any)
        .from('import_history')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedHistory: ImportRecord[] = (data || []).map((item: any) => ({
        id: item.id,
        fileName: item.file_name,
        importType: item.import_type as 'turmas' | 'alunos' | 'professores',
        status: item.status as 'processing' | 'completed' | 'failed',
        rowsProcessed: item.rows_processed || 0,
        rowsSucceeded: item.rows_succeeded || 0,
        rowsFailed: item.rows_failed || 0,
        errorLog: item.error_log || [],
        importedBy: item.imported_by || '',
        createdAt: item.created_at,
        schoolId: item.school_id || '',
      }));

      set({ history: mappedHistory, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error('Error loading import history:', error);
    }
  },

  addRecord: async (record) => {
    try {
      const { data, error } = await (supabase as any)
        .from('import_history')
        .insert({
          file_name: record.fileName,
          import_type: record.importType,
          status: record.status,
          rows_processed: record.rowsProcessed,
          rows_succeeded: record.rowsSucceeded,
          rows_failed: record.rowsFailed,
          error_log: record.errorLog,
          imported_by: record.importedBy,
          school_id: record.schoolId,
        })
        .select()
        .single();

      if (error) throw error;

      const newRecord: ImportRecord = {
        id: data.id,
        fileName: data.file_name,
        importType: data.import_type as 'turmas' | 'alunos' | 'professores',
        status: data.status as 'processing' | 'completed' | 'failed',
        rowsProcessed: data.rows_processed || 0,
        rowsSucceeded: data.rows_succeeded || 0,
        rowsFailed: data.rows_failed || 0,
        errorLog: data.error_log || [],
        importedBy: data.imported_by || '',
        createdAt: data.created_at,
        schoolId: data.school_id || '',
      };

      set(state => ({ history: [newRecord, ...state.history] }));
      return newRecord;
    } catch (error: any) {
      console.error('Error adding import record:', error);
      throw error;
    }
  },

  updateRecord: async (id, updates) => {
    try {
      const dbUpdates: any = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.rowsProcessed !== undefined) dbUpdates.rows_processed = updates.rowsProcessed;
      if (updates.rowsSucceeded !== undefined) dbUpdates.rows_succeeded = updates.rowsSucceeded;
      if (updates.rowsFailed !== undefined) dbUpdates.rows_failed = updates.rowsFailed;
      if (updates.errorLog !== undefined) dbUpdates.error_log = updates.errorLog;

      const { error } = await (supabase as any)
        .from('import_history')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        history: state.history.map(record =>
          record.id === id ? { ...record, ...updates } : record
        ),
      }));
    } catch (error: any) {
      console.error('Error updating import record:', error);
      throw error;
    }
  },

  setFilters: (filters) => {
    set({ filters });
  },

  getFilteredHistory: () => {
    const { history, filters } = get();
    return history.filter(record => {
      const matchesSearch = !filters.search || 
        record.fileName.toLowerCase().includes(filters.search.toLowerCase());
      const matchesType = !filters.importType || record.importType === filters.importType;
      return matchesSearch && matchesType;
    });
  },
}));

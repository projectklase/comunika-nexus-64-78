import { create } from 'zustand';
import { ImportRecord, ImportHistoryFilters } from '@/types/import';

interface ImportHistoryStore {
  importHistory: ImportRecord[];
  filters: ImportHistoryFilters;
  setFilters: (filters: Partial<ImportHistoryFilters>) => void;
  addImportRecord: (record: Omit<ImportRecord, 'id' | 'importedAt'>) => void;
  getFilteredHistory: () => ImportRecord[];
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const STORAGE_KEY = 'import-history';

export const useImportHistoryStore = create<ImportHistoryStore>((set, get) => ({
  importHistory: [],
  filters: {
    search: '',
    type: undefined,
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }));
  },

  addImportRecord: (recordData) => {
    const record: ImportRecord = {
      ...recordData,
      id: crypto.randomUUID(),
      importedAt: new Date().toISOString(),
    };
    
    set((state) => ({
      importHistory: [record, ...state.importHistory]
    }));
    
    get().saveToStorage();
  },

  getFilteredHistory: () => {
    const { importHistory, filters } = get();
    
    return importHistory.filter((record) => {
      const matchesSearch = !filters.search || 
        record.fileName.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesType = !filters.type || 
        record.type === filters.type;
      
      return matchesSearch && matchesType;
    });
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const importHistory = JSON.parse(stored);
        set({ importHistory });
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de importações:', error);
    }
  },

  saveToStorage: () => {
    try {
      const { importHistory } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importHistory));
    } catch (error) {
      console.error('Erro ao salvar histórico de importações:', error);
    }
  },
}));
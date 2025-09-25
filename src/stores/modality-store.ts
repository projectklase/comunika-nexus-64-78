import { create } from 'zustand';
import { Modality, ModalityFilters } from '@/types/curriculum';

interface ModalityStore {
  modalities: Modality[];
  loading: boolean;
  
  // Basic CRUD
  loadModalities: () => void;
  getModality: (id: string) => Modality | undefined;
  createModality: (modalityData: Omit<Modality, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Modality>;
  updateModality: (id: string, updates: Partial<Modality>) => Promise<void>;
  deleteModality: (id: string) => Promise<void>;
  
  // Status operations
  activateModality: (id: string) => Promise<void>;
  deactivateModality: (id: string) => Promise<void>;
  
  // Selectors
  getFilteredModalities: (filters: ModalityFilters) => Modality[];
  getModalitiesByProgram: (programId: string) => Modality[];
  getActiveModalitiesByProgram: (programId: string) => Modality[];
}

const STORAGE_KEY = 'comunika_modalities';

const generateId = () => crypto.randomUUID();

const saveToStorage = (modalities: Modality[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modalities));
};

const loadFromStorage = (): Modality[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Mock data
const mockModalities: Modality[] = [
  {
    id: 'mod-1',
    programId: 'prog-2', // Inglês
    name: 'Regular',
    code: 'REG',
    description: 'Modalidade regular de 2x por semana',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'mod-2',
    programId: 'prog-2', // Inglês
    name: 'Intensivo',
    code: 'INT',
    description: 'Modalidade intensiva de 3x por semana',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'mod-3',
    programId: 'prog-3', // Futebol
    name: 'Iniciante',
    code: 'INI',
    description: 'Para alunos que estão começando',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
];

export const useModalityStore = create<ModalityStore>((set, get) => ({
  modalities: [],
  loading: false,

  loadModalities: () => {
    const modalities = loadFromStorage();
    if (modalities.length === 0) {
      set({ modalities: mockModalities });
      saveToStorage(mockModalities);
    } else {
      set({ modalities });
    }
  },

  getModality: (id: string) => {
    return get().modalities.find(m => m.id === id);
  },

  createModality: async (modalityData) => {
    const newModality: Modality = {
      ...modalityData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const modalities = [...get().modalities, newModality];
    set({ modalities });
    saveToStorage(modalities);
    return newModality;
  },

  updateModality: async (id: string, updates) => {
    const modalities = get().modalities.map(m => 
      m.id === id 
        ? { ...m, ...updates, updatedAt: new Date().toISOString() }
        : m
    );
    set({ modalities });
    saveToStorage(modalities);
  },

  deleteModality: async (id: string) => {
    const modalities = get().modalities.filter(m => m.id !== id);
    set({ modalities });
    saveToStorage(modalities);
  },

  activateModality: async (id: string) => {
    await get().updateModality(id, { isActive: true });
  },

  deactivateModality: async (id: string) => {
    await get().updateModality(id, { isActive: false });
  },

  getFilteredModalities: (filters: ModalityFilters) => {
    const modalities = get().modalities;
    return modalities.filter(m => {
      if (filters.search && !m.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !m.code?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.programId && m.programId !== filters.programId) return false;
      if (filters.isActive !== undefined && m.isActive !== filters.isActive) return false;
      return true;
    });
  },

  getModalitiesByProgram: (programId: string) => {
    return get().modalities.filter(m => m.programId === programId);
  },

  getActiveModalitiesByProgram: (programId: string) => {
    return get().modalities.filter(m => m.programId === programId && m.isActive);
  },
}));
import { create } from 'zustand';
import { Program, ProgramFilters } from '@/types/curriculum';

interface ProgramStore {
  programs: Program[];
  loading: boolean;
  
  // Basic CRUD
  loadPrograms: () => void;
  getProgram: (id: string) => Program | undefined;
  createProgram: (programData: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Program>;
  updateProgram: (id: string, updates: Partial<Program>) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  
  // Status operations
  activateProgram: (id: string) => Promise<void>;
  deactivateProgram: (id: string) => Promise<void>;
  
  // Selectors
  getFilteredPrograms: (filters: ProgramFilters) => Program[];
  getActivePrograms: () => Program[];
}

const STORAGE_KEY = 'comunika_programs';

const generateId = () => crypto.randomUUID();

const saveToStorage = (programs: Program[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
};

const loadFromStorage = (): Program[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Mock data
const mockPrograms: Program[] = [
  {
    id: 'prog-1',
    name: 'Ensino Fundamental',
    code: 'EF',
    description: 'Programa regular do ensino fundamental',
    curriculumMode: 'SUBJECTS',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'prog-2',
    name: 'Inglês',
    code: 'ENG',
    description: 'Curso de idioma inglês',
    curriculumMode: 'MODALITIES',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'prog-3',
    name: 'Futebol',
    code: 'FUT',
    description: 'Escolinha de futebol',
    curriculumMode: 'MODALITIES',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
];

export const useProgramStore = create<ProgramStore>((set, get) => ({
  programs: [],
  loading: false,

  loadPrograms: () => {
    const programs = loadFromStorage();
    if (programs.length === 0) {
      set({ programs: mockPrograms });
      saveToStorage(mockPrograms);
    } else {
      set({ programs });
    }
  },

  getProgram: (id: string) => {
    return get().programs.find(p => p.id === id);
  },

  createProgram: async (programData) => {
    const newProgram: Program = {
      ...programData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const programs = [...get().programs, newProgram];
    set({ programs });
    saveToStorage(programs);
    return newProgram;
  },

  updateProgram: async (id: string, updates) => {
    const programs = get().programs.map(p => 
      p.id === id 
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    );
    set({ programs });
    saveToStorage(programs);
  },

  deleteProgram: async (id: string) => {
    const programs = get().programs.filter(p => p.id !== id);
    set({ programs });
    saveToStorage(programs);
  },

  activateProgram: async (id: string) => {
    await get().updateProgram(id, { isActive: true });
  },

  deactivateProgram: async (id: string) => {
    await get().updateProgram(id, { isActive: false });
  },

  getFilteredPrograms: (filters: ProgramFilters) => {
    const programs = get().programs;
    return programs.filter(p => {
      if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !p.code?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.isActive !== undefined && p.isActive !== filters.isActive) return false;
      return true;
    });
  },

  getActivePrograms: () => {
    return get().programs.filter(p => p.isActive);
  },
}));
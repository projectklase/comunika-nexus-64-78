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

// NOTE: This store is deprecated for Programs functionality
// Programs now use usePrograms hook with Supabase integration
// This store is kept only for backwards compatibility with other features (Levels, Subjects, Modalities)
export const useProgramStore = create<ProgramStore>((set, get) => ({
  programs: [], // Empty - Programs now use Supabase via usePrograms hook
  loading: false,

  loadPrograms: () => {
    // No-op - Programs now use Supabase
    set({ programs: [] });
  },

  getProgram: (id: string) => {
    return get().programs.find(p => p.id === id);
  },

  createProgram: async (programData) => {
    // Deprecated - use usePrograms hook instead
    throw new Error('Use usePrograms hook for program operations');
  },

  updateProgram: async (id: string, updates) => {
    // Deprecated - use usePrograms hook instead
    throw new Error('Use usePrograms hook for program operations');
  },

  deleteProgram: async (id: string) => {
    // Deprecated - use usePrograms hook instead
    throw new Error('Use usePrograms hook for program operations');
  },

  activateProgram: async (id: string) => {
    // Deprecated - use usePrograms hook instead
    throw new Error('Use usePrograms hook for program operations');
  },

  deactivateProgram: async (id: string) => {
    // Deprecated - use usePrograms hook instead
    throw new Error('Use usePrograms hook for program operations');
  },

  getFilteredPrograms: (filters: ProgramFilters) => {
    // Empty array - Programs now use Supabase
    return [];
  },

  getActivePrograms: () => {
    // Empty array - Programs now use Supabase
    return [];
  },
}));
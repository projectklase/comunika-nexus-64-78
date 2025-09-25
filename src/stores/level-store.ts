import { create } from 'zustand';
import { Level, LevelFilters } from '@/types/curriculum';

interface LevelStore {
  levels: Level[];
  loading: boolean;
  
  // Basic CRUD
  loadLevels: () => void;
  getLevel: (id: string) => Level | undefined;
  createLevel: (levelData: Omit<Level, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Level>;
  updateLevel: (id: string, updates: Partial<Level>) => Promise<void>;
  deleteLevel: (id: string) => Promise<void>;
  
  // Status operations
  activateLevel: (id: string) => Promise<void>;
  deactivateLevel: (id: string) => Promise<void>;
  
  // Selectors
  getFilteredLevels: (filters: LevelFilters) => Level[];
  getLevelsByProgram: (programId: string) => Level[];
  getActiveLevelsByProgram: (programId: string) => Level[];
}

const STORAGE_KEY = 'comunika_levels';

const generateId = () => crypto.randomUUID();

const saveToStorage = (levels: Level[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
};

const loadFromStorage = (): Level[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Mock data
const mockLevels: Level[] = [
  {
    id: 'level-1',
    programId: 'prog-1',
    name: '6º ano',
    order: 6,
    description: 'Sexto ano do ensino fundamental',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'level-2',
    programId: 'prog-1',
    name: '7º ano',
    order: 7,
    description: 'Sétimo ano do ensino fundamental',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'level-3',
    programId: 'prog-2',
    name: 'A1',
    order: 1,
    description: 'Nível básico de inglês',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'level-4',
    programId: 'prog-2',
    name: 'A2',
    order: 2,
    description: 'Nível elementar de inglês',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'level-5',
    programId: 'prog-3',
    name: 'Sub-13',
    order: 1,
    description: 'Categoria sub-13 do futebol',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
];

export const useLevelStore = create<LevelStore>((set, get) => ({
  levels: [],
  loading: false,

  loadLevels: () => {
    const levels = loadFromStorage();
    if (levels.length === 0) {
      set({ levels: mockLevels });
      saveToStorage(mockLevels);
    } else {
      set({ levels });
    }
  },

  getLevel: (id: string) => {
    return get().levels.find(l => l.id === id);
  },

  createLevel: async (levelData) => {
    const newLevel: Level = {
      ...levelData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const levels = [...get().levels, newLevel];
    set({ levels });
    saveToStorage(levels);
    return newLevel;
  },

  updateLevel: async (id: string, updates) => {
    const levels = get().levels.map(l => 
      l.id === id 
        ? { ...l, ...updates, updatedAt: new Date().toISOString() }
        : l
    );
    set({ levels });
    saveToStorage(levels);
  },

  deleteLevel: async (id: string) => {
    const levels = get().levels.filter(l => l.id !== id);
    set({ levels });
    saveToStorage(levels);
  },

  activateLevel: async (id: string) => {
    await get().updateLevel(id, { isActive: true });
  },

  deactivateLevel: async (id: string) => {
    await get().updateLevel(id, { isActive: false });
  },

  getFilteredLevels: (filters: LevelFilters) => {
    const levels = get().levels;
    return levels.filter(l => {
      if (filters.search && !l.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.programId && l.programId !== filters.programId) return false;
      if (filters.isActive !== undefined && l.isActive !== filters.isActive) return false;
      return true;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  getLevelsByProgram: (programId: string) => {
    return get().levels
      .filter(l => l.programId === programId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  getActiveLevelsByProgram: (programId: string) => {
    return get().levels
      .filter(l => l.programId === programId && l.isActive)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },
}));
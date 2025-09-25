import { create } from 'zustand';

export interface GlobalLevel {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalLevelFilters {
  search: string;
  isActive?: boolean;
}

interface GlobalLevelStore {
  levels: GlobalLevel[];
  loading: boolean;
  
  // Basic CRUD
  loadLevels: () => void;
  getLevel: (id: string) => GlobalLevel | undefined;
  createLevel: (levelData: Omit<GlobalLevel, 'id' | 'createdAt' | 'updatedAt'>) => Promise<GlobalLevel>;
  updateLevel: (id: string, updates: Partial<GlobalLevel>) => Promise<void>;
  deleteLevel: (id: string) => Promise<void>;
  
  // Status operations
  activateLevel: (id: string) => Promise<void>;
  deactivateLevel: (id: string) => Promise<void>;
  
  // Selectors
  getFilteredLevels: (filters: GlobalLevelFilters) => GlobalLevel[];
  getActiveLevels: () => GlobalLevel[];
}

const STORAGE_KEY = 'komunika_levels';
const OLD_STORAGE_KEY = 'comunika_levels_old';

const generateId = () => crypto.randomUUID();

const saveToStorage = (levels: GlobalLevel[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
};

const loadFromStorage = (): GlobalLevel[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Migração dos dados antigos
const migrateOldData = (): GlobalLevel[] => {
  try {
    const oldStored = localStorage.getItem('comunika_levels');
    if (!oldStored) return [];
    
    const oldLevels = JSON.parse(oldStored);
    const migratedLevels: GlobalLevel[] = oldLevels.map((oldLevel: any) => ({
      id: oldLevel.id,
      name: oldLevel.name,
      code: oldLevel.code,
      description: oldLevel.description,
      isActive: oldLevel.isActive,
      order: oldLevel.order,
      createdAt: oldLevel.createdAt,
      updatedAt: oldLevel.updatedAt,
    }));
    
    // Salvar dados antigos para backup
    localStorage.setItem(OLD_STORAGE_KEY, oldStored);
    
    return migratedLevels;
  } catch {
    return [];
  }
};

export const useGlobalLevelStore = create<GlobalLevelStore>((set, get) => ({
  levels: [],
  loading: false,

  loadLevels: () => {
    let levels = loadFromStorage();
    
    // Se não há dados novos, tentar migrar dos antigos
    if (levels.length === 0) {
      levels = migrateOldData();
      if (levels.length > 0) {
        saveToStorage(levels);
      }
    }
    
    set({ levels });
  },

  getLevel: (id: string) => {
    return get().levels.find(l => l.id === id);
  },

  createLevel: async (levelData) => {
    const newLevel: GlobalLevel = {
      ...levelData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const levels = [...get().levels, newLevel];
    set({ levels });
    saveToStorage(levels);
    
    // Log audit event
    const { logAudit } = await import('@/stores/audit-store');
    logAudit({
      action: 'CREATE',
      entity: 'LEVEL',
      entity_id: newLevel.id,
      entity_label: newLevel.name,
      actor_id: 'system', // Will be filled by actual user context
      actor_name: 'Sistema',
      actor_email: '',
      actor_role: 'secretaria',
      meta: { levelData }
    });
    
    return newLevel;
  },

  updateLevel: async (id: string, updates) => {
    const oldLevel = get().levels.find(l => l.id === id);
    const levels = get().levels.map(l => 
      l.id === id 
        ? { ...l, ...updates, updatedAt: new Date().toISOString() }
        : l
    );
    set({ levels });
    saveToStorage(levels);
    
    // Log audit event
    if (oldLevel) {
      const { logAudit } = await import('@/stores/audit-store');
      const { generateDiff } = await import('@/utils/audit-helpers');
      const diff = generateDiff(oldLevel, { ...oldLevel, ...updates });
      
      logAudit({
        action: 'UPDATE',
        entity: 'LEVEL',
        entity_id: id,
        entity_label: oldLevel.name,
        actor_id: 'system',
        actor_name: 'Sistema', 
        actor_email: '',
        actor_role: 'secretaria',
        diff_json: diff,
        meta: { fields: Object.keys(updates) }
      });
    }
  },

  deleteLevel: async (id: string) => {
    const levelToDelete = get().levels.find(l => l.id === id);
    const levels = get().levels.filter(l => l.id !== id);
    set({ levels });
    saveToStorage(levels);
    
    // Log audit event
    if (levelToDelete) {
      const { logAudit } = await import('@/stores/audit-store');
      logAudit({
        action: 'DELETE',
        entity: 'LEVEL',
        entity_id: id,
        entity_label: levelToDelete.name,
        actor_id: 'system',
        actor_name: 'Sistema',
        actor_email: '',
        actor_role: 'secretaria',
        meta: { deletedLevel: levelToDelete }
      });
    }
  },

  activateLevel: async (id: string) => {
    await get().updateLevel(id, { isActive: true });
  },

  deactivateLevel: async (id: string) => {
    await get().updateLevel(id, { isActive: false });
  },

  getFilteredLevels: (filters: GlobalLevelFilters) => {
    const levels = get().levels;
    return levels.filter(l => {
      if (filters.search && !l.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !l.code?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.isActive !== undefined && l.isActive !== filters.isActive) return false;
      return true;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  getActiveLevels: () => {
    return get().levels
      .filter(l => l.isActive)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },
}));
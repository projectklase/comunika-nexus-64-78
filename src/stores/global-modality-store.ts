import { create } from 'zustand';

export interface GlobalModality {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalModalityFilters {
  search: string;
  isActive?: boolean;
}

interface GlobalModalityStore {
  modalities: GlobalModality[];
  loading: boolean;
  
  // Basic CRUD
  loadModalities: () => void;
  getModality: (id: string) => GlobalModality | undefined;
  createModality: (modalityData: Omit<GlobalModality, 'id' | 'createdAt' | 'updatedAt'>) => Promise<GlobalModality>;
  updateModality: (id: string, updates: Partial<GlobalModality>) => Promise<void>;
  deleteModality: (id: string) => Promise<void>;
  
  // Status operations
  activateModality: (id: string) => Promise<void>;
  deactivateModality: (id: string) => Promise<void>;
  
  // Selectors
  getFilteredModalities: (filters: GlobalModalityFilters) => GlobalModality[];
  getActiveModalities: () => GlobalModality[];
}

const STORAGE_KEY = 'komunika_modalities';
const OLD_STORAGE_KEY = 'komunika_modalities_old';

const generateId = () => crypto.randomUUID();

const saveToStorage = (modalities: GlobalModality[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modalities));
};

const loadFromStorage = (): GlobalModality[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Migração dos dados antigos
const migrateOldData = (): GlobalModality[] => {
  try {
    const oldStored = localStorage.getItem('comunika_modalities');
    if (!oldStored) return [];
    
    const oldModalities = JSON.parse(oldStored);
    const migratedModalities: GlobalModality[] = oldModalities.map((oldModality: any) => ({
      id: oldModality.id,
      name: oldModality.name,
      code: oldModality.code,
      description: oldModality.description,
      isActive: oldModality.isActive,
      createdAt: oldModality.createdAt,
      updatedAt: oldModality.updatedAt,
    }));
    
    // Salvar dados antigos para backup
    localStorage.setItem(OLD_STORAGE_KEY, oldStored);
    
    return migratedModalities;
  } catch {
    return [];
  }
};

export const useGlobalModalityStore = create<GlobalModalityStore>((set, get) => ({
  modalities: [],
  loading: false,
  lastCreatedId: null,

  loadModalities: () => {
    let modalities = loadFromStorage();
    
    // Se não há dados novos, tentar migrar dos antigos
    if (modalities.length === 0) {
      modalities = migrateOldData();
      if (modalities.length > 0) {
        saveToStorage(modalities);
      }
    }
    
    set({ modalities });
  },

  getModality: (id: string) => {
    return get().modalities.find(m => m.id === id);
  },

  createModality: async (modalityData) => {
    const newModality: GlobalModality = {
      ...modalityData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const modalities = [...get().modalities, newModality];
    set({ modalities });
    saveToStorage(modalities);
    
    // Log audit event
    const { logAudit } = await import('@/stores/audit-store');
    logAudit({
      action: 'CREATE',
      entity: 'MODALIDADE',
      entity_id: newModality.id,
      entity_label: newModality.name,
      actor_id: 'system',
      actor_name: 'Sistema',
      actor_email: '',
      actor_role: 'secretaria',
      meta: { modalityData }
    });
    
    return newModality;
  },

  updateModality: async (id: string, updates) => {
    const oldModality = get().modalities.find(m => m.id === id);
    const modalities = get().modalities.map(m => 
      m.id === id 
        ? { ...m, ...updates, updatedAt: new Date().toISOString() }
        : m
    );
    set({ modalities });
    saveToStorage(modalities);
    
    // Log audit event
    if (oldModality) {
      const { logAudit } = await import('@/stores/audit-store');
      const { generateDiff } = await import('@/utils/audit-helpers');
      const diff = generateDiff(oldModality, { ...oldModality, ...updates });
      
      logAudit({
        action: 'UPDATE',
        entity: 'MODALIDADE',
        entity_id: id,
        entity_label: oldModality.name,
        actor_id: 'system',
        actor_name: 'Sistema',
        actor_email: '',
        actor_role: 'secretaria',
        diff_json: diff,
        meta: { fields: Object.keys(updates) }
      });
    }
  },

  deleteModality: async (id: string) => {
    const modalityToDelete = get().modalities.find(m => m.id === id);
    const modalities = get().modalities.filter(m => m.id !== id);
    set({ modalities });
    saveToStorage(modalities);
    
    // Log audit event
    if (modalityToDelete) {
      const { logAudit } = await import('@/stores/audit-store');
      logAudit({
        action: 'DELETE',
        entity: 'MODALIDADE',
        entity_id: id,
        entity_label: modalityToDelete.name,
        actor_id: 'system',
        actor_name: 'Sistema',
        actor_email: '',
        actor_role: 'secretaria',
        meta: { deletedModality: modalityToDelete }
      });
    }
  },

  activateModality: async (id: string) => {
    await get().updateModality(id, { isActive: true });
  },

  deactivateModality: async (id: string) => {
    await get().updateModality(id, { isActive: false });
  },

  getFilteredModalities: (filters: GlobalModalityFilters) => {
    const modalities = get().modalities;
    return modalities.filter(m => {
      if (filters.search && !m.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !m.code?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.isActive !== undefined && m.isActive !== filters.isActive) return false;
      return true;
    });
  },

  getActiveModalities: () => {
    return get().modalities.filter(m => m.isActive);
  },
}));
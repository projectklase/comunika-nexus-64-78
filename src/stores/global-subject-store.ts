import { create } from 'zustand';

export interface GlobalSubject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalSubjectFilters {
  search: string;
  isActive?: boolean;
}

interface GlobalSubjectStore {
  subjects: GlobalSubject[];
  loading: boolean;
  
  // Basic CRUD
  loadSubjects: () => void;
  getSubject: (id: string) => GlobalSubject | undefined;
  createSubject: (subjectData: Omit<GlobalSubject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<GlobalSubject>;
  updateSubject: (id: string, updates: Partial<GlobalSubject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  
  // Status operations
  activateSubject: (id: string) => Promise<void>;
  deactivateSubject: (id: string) => Promise<void>;
  
  // Selectors
  getFilteredSubjects: (filters: GlobalSubjectFilters) => GlobalSubject[];
  getActiveSubjects: () => GlobalSubject[];
}

const STORAGE_KEY = 'komunika_subjects';
const OLD_STORAGE_KEY = 'komunika_subjects_old';

const generateId = () => crypto.randomUUID();

const saveToStorage = (subjects: GlobalSubject[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
};

const loadFromStorage = (): GlobalSubject[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Migração dos dados antigos
const migrateOldData = (): GlobalSubject[] => {
  try {
    const oldStored = localStorage.getItem('comunika_subjects');
    if (!oldStored) return [];
    
    const oldSubjects = JSON.parse(oldStored);
    const migratedSubjects: GlobalSubject[] = oldSubjects.map((oldSubject: any) => ({
      id: oldSubject.id,
      name: oldSubject.name,
      code: oldSubject.code,
      description: oldSubject.description,
      isActive: oldSubject.isActive,
      createdAt: oldSubject.createdAt,
      updatedAt: oldSubject.updatedAt,
    }));
    
    // Salvar dados antigos para backup
    localStorage.setItem(OLD_STORAGE_KEY, oldStored);
    
    return migratedSubjects;
  } catch {
    return [];
  }
};

export const useGlobalSubjectStore = create<GlobalSubjectStore>((set, get) => ({
  subjects: [],
  loading: false,

  loadSubjects: () => {
    let subjects = loadFromStorage();
    
    // Se não há dados novos, tentar migrar dos antigos
    if (subjects.length === 0) {
      subjects = migrateOldData();
      if (subjects.length > 0) {
        saveToStorage(subjects);
      }
    }
    
    set({ subjects });
  },

  getSubject: (id: string) => {
    return get().subjects.find(s => s.id === id);
  },

  createSubject: async (subjectData) => {
    const newSubject: GlobalSubject = {
      ...subjectData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const subjects = [...get().subjects, newSubject];
    set({ subjects });
    saveToStorage(subjects);
    
    // Log audit event
    const { logAudit } = await import('@/stores/audit-store');
    logAudit({
      action: 'CREATE',
      entity: 'SUBJECT',
      entity_id: newSubject.id,
      entity_label: newSubject.name,
      actor_id: 'system',
      actor_name: 'Sistema',
      actor_email: '',
      actor_role: 'secretaria',
      meta: { subjectData }
    });
    
    return newSubject;
  },

  updateSubject: async (id: string, updates) => {
    const oldSubject = get().subjects.find(s => s.id === id);
    const subjects = get().subjects.map(s => 
      s.id === id 
        ? { ...s, ...updates, updatedAt: new Date().toISOString() }
        : s
    );
    set({ subjects });
    saveToStorage(subjects);
    
    // Log audit event
    if (oldSubject) {
      const { logAudit } = await import('@/stores/audit-store');
      const { generateDiff } = await import('@/utils/audit-helpers');
      const diff = generateDiff(oldSubject, { ...oldSubject, ...updates });
      
      logAudit({
        action: 'UPDATE',
        entity: 'SUBJECT',
        entity_id: id,
        entity_label: oldSubject.name,
        actor_id: 'system',
        actor_name: 'Sistema',
        actor_email: '',
        actor_role: 'secretaria',
        diff_json: diff,
        meta: { fields: Object.keys(updates) }
      });
    }
  },

  deleteSubject: async (id: string) => {
    const subjectToDelete = get().subjects.find(s => s.id === id);
    const subjects = get().subjects.filter(s => s.id !== id);
    set({ subjects });
    saveToStorage(subjects);
    
    // Log audit event
    if (subjectToDelete) {
      const { logAudit } = await import('@/stores/audit-store');
      logAudit({
        action: 'DELETE',
        entity: 'SUBJECT',
        entity_id: id,
        entity_label: subjectToDelete.name,
        actor_id: 'system',
        actor_name: 'Sistema',
        actor_email: '',
        actor_role: 'secretaria',
        meta: { deletedSubject: subjectToDelete }
      });
    }
  },

  activateSubject: async (id: string) => {
    await get().updateSubject(id, { isActive: true });
  },

  deactivateSubject: async (id: string) => {
    await get().updateSubject(id, { isActive: false });
  },

  getFilteredSubjects: (filters: GlobalSubjectFilters) => {
    const subjects = get().subjects;
    return subjects.filter(s => {
      if (filters.search && !s.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !s.code?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.isActive !== undefined && s.isActive !== filters.isActive) return false;
      return true;
    });
  },

  getActiveSubjects: () => {
    return get().subjects.filter(s => s.isActive);
  },
}));
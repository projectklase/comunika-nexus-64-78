import { create } from 'zustand';
import { Subject, SubjectFilters } from '@/types/curriculum';

interface SubjectStore {
  subjects: Subject[];
  loading: boolean;
  
  // Basic CRUD
  loadSubjects: () => void;
  getSubject: (id: string) => Subject | undefined;
  createSubject: (subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Subject>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  
  // Status operations
  activateSubject: (id: string) => Promise<void>;
  deactivateSubject: (id: string) => Promise<void>;
  
  // Selectors
  getFilteredSubjects: (filters: SubjectFilters) => Subject[];
  getSubjectsByProgram: (programId: string) => Subject[];
  getActiveSubjectsByProgram: (programId: string) => Subject[];
}

const STORAGE_KEY = 'comunika_subjects';

const generateId = () => crypto.randomUUID();

const saveToStorage = (subjects: Subject[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
};

const loadFromStorage = (): Subject[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Mock data
const mockSubjects: Subject[] = [
  {
    id: 'subj-1',
    programId: 'prog-1',
    name: 'Matemática',
    code: 'MAT',
    description: 'Disciplina de matemática',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'subj-2',
    programId: 'prog-1',
    name: 'Português',
    code: 'PORT',
    description: 'Disciplina de língua portuguesa',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'subj-3',
    programId: 'prog-2',
    name: 'Gramática',
    code: 'GRAM',
    description: 'Gramática inglesa',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'subj-4',
    programId: 'prog-2',
    name: 'Conversação',
    code: 'CONV',
    description: 'Conversação em inglês',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'subj-5',
    programId: 'prog-3',
    name: 'Fundamentos',
    code: 'FUND',
    description: 'Fundamentos do futebol',
    isActive: true,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
];

export const useSubjectStore = create<SubjectStore>((set, get) => ({
  subjects: [],
  loading: false,

  loadSubjects: () => {
    const subjects = loadFromStorage();
    if (subjects.length === 0) {
      set({ subjects: mockSubjects });
      saveToStorage(mockSubjects);
    } else {
      set({ subjects });
    }
  },

  getSubject: (id: string) => {
    return get().subjects.find(s => s.id === id);
  },

  createSubject: async (subjectData) => {
    const newSubject: Subject = {
      ...subjectData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const subjects = [...get().subjects, newSubject];
    set({ subjects });
    saveToStorage(subjects);
    return newSubject;
  },

  updateSubject: async (id: string, updates) => {
    const subjects = get().subjects.map(s => 
      s.id === id 
        ? { ...s, ...updates, updatedAt: new Date().toISOString() }
        : s
    );
    set({ subjects });
    saveToStorage(subjects);
  },

  deleteSubject: async (id: string) => {
    const subjects = get().subjects.filter(s => s.id !== id);
    set({ subjects });
    saveToStorage(subjects);
  },

  activateSubject: async (id: string) => {
    await get().updateSubject(id, { isActive: true });
  },

  deactivateSubject: async (id: string) => {
    await get().updateSubject(id, { isActive: false });
  },

  getFilteredSubjects: (filters: SubjectFilters) => {
    const subjects = get().subjects;
    return subjects.filter(s => {
      if (filters.search && !s.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !s.code?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.programId && s.programId !== filters.programId) return false;
      if (filters.isActive !== undefined && s.isActive !== filters.isActive) return false;
      return true;
    });
  },

  getSubjectsByProgram: (programId: string) => {
    return get().subjects.filter(s => s.programId === programId);
  },

  getActiveSubjectsByProgram: (programId: string) => {
    return get().subjects.filter(s => s.programId === programId && s.isActive);
  },
}));
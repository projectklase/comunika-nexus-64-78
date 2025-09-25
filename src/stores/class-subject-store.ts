import { create } from 'zustand';
import { ClassSubject } from '@/types/curriculum';

interface ClassSubjectStore {
  classSubjects: ClassSubject[];
  loading: boolean;
  
  // Basic CRUD
  loadClassSubjects: () => void;
  getClassSubject: (id: string) => ClassSubject | undefined;
  createClassSubject: (data: Omit<ClassSubject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ClassSubject>;
  updateClassSubject: (id: string, updates: Partial<ClassSubject>) => Promise<void>;
  deleteClassSubject: (id: string) => Promise<void>;
  
  // Class operations
  addSubjectsToClass: (classId: string, subjectIds: string[]) => Promise<void>;
  removeSubjectFromClass: (classId: string, subjectId: string) => Promise<void>;
  assignTeacherToSubject: (classId: string, subjectId: string, teacherId: string) => Promise<void>;
  removeTeacherFromSubject: (classId: string, subjectId: string) => Promise<void>;
  
  // Selectors
  getClassSubjects: (classId: string) => ClassSubject[];
  getSubjectClasses: (subjectId: string) => ClassSubject[];
  getTeacherClassSubjects: (teacherId: string) => ClassSubject[];
}

const STORAGE_KEY = 'comunika_class_subjects';

const generateId = () => crypto.randomUUID();

const saveToStorage = (classSubjects: ClassSubject[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(classSubjects));
};

const loadFromStorage = (): ClassSubject[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Mock data
const mockClassSubjects: ClassSubject[] = [
  {
    id: 'cs-1',
    classId: 'class-6a',
    subjectId: 'subj-1',
    teacherId: 'teacher-1',
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'cs-2',
    classId: 'class-6a',
    subjectId: 'subj-2',
    teacherId: 'teacher-2',
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
];

export const useClassSubjectStore = create<ClassSubjectStore>((set, get) => ({
  classSubjects: [],
  loading: false,

  loadClassSubjects: () => {
    const classSubjects = loadFromStorage();
    if (classSubjects.length === 0) {
      set({ classSubjects: mockClassSubjects });
      saveToStorage(mockClassSubjects);
    } else {
      set({ classSubjects });
    }
  },

  getClassSubject: (id: string) => {
    return get().classSubjects.find(cs => cs.id === id);
  },

  createClassSubject: async (data) => {
    const newClassSubject: ClassSubject = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const classSubjects = [...get().classSubjects, newClassSubject];
    set({ classSubjects });
    saveToStorage(classSubjects);
    return newClassSubject;
  },

  updateClassSubject: async (id: string, updates) => {
    const classSubjects = get().classSubjects.map(cs => 
      cs.id === id 
        ? { ...cs, ...updates, updatedAt: new Date().toISOString() }
        : cs
    );
    set({ classSubjects });
    saveToStorage(classSubjects);
  },

  deleteClassSubject: async (id: string) => {
    const classSubjects = get().classSubjects.filter(cs => cs.id !== id);
    set({ classSubjects });
    saveToStorage(classSubjects);
  },

  addSubjectsToClass: async (classId: string, subjectIds: string[]) => {
    const existingSubjects = get().classSubjects
      .filter(cs => cs.classId === classId)
      .map(cs => cs.subjectId);
    
    const newSubjects = subjectIds.filter(id => !existingSubjects.includes(id));
    
    for (const subjectId of newSubjects) {
      await get().createClassSubject({ classId, subjectId });
    }
  },

  removeSubjectFromClass: async (classId: string, subjectId: string) => {
    const classSubject = get().classSubjects.find(cs => 
      cs.classId === classId && cs.subjectId === subjectId
    );
    
    if (classSubject) {
      await get().deleteClassSubject(classSubject.id);
    }
  },

  assignTeacherToSubject: async (classId: string, subjectId: string, teacherId: string) => {
    const classSubject = get().classSubjects.find(cs => 
      cs.classId === classId && cs.subjectId === subjectId
    );
    
    if (classSubject) {
      await get().updateClassSubject(classSubject.id, { teacherId });
    }
  },

  removeTeacherFromSubject: async (classId: string, subjectId: string) => {
    const classSubject = get().classSubjects.find(cs => 
      cs.classId === classId && cs.subjectId === subjectId
    );
    
    if (classSubject) {
      await get().updateClassSubject(classSubject.id, { teacherId: undefined });
    }
  },

  getClassSubjects: (classId: string) => {
    return get().classSubjects.filter(cs => cs.classId === classId);
  },

  getSubjectClasses: (subjectId: string) => {
    return get().classSubjects.filter(cs => cs.subjectId === subjectId);
  },

  getTeacherClassSubjects: (teacherId: string) => {
    return get().classSubjects.filter(cs => cs.teacherId === teacherId);
  },
}));
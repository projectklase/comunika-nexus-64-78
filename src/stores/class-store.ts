import { create } from 'zustand';
import { SchoolClass, ClassStatus, ClassFilters } from '@/types/class';
// Mock data removed - now using Supabase data
import { validateClassData } from '@/lib/data-hygiene';

interface ClassStore {
  classes: SchoolClass[];
  loading: boolean;
  
  // Basic CRUD
  loadClasses: () => void;
  getClass: (id: string) => SchoolClass | undefined;
  createClass: (classData: Omit<SchoolClass, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SchoolClass>;
  updateClass: (id: string, updates: Partial<SchoolClass>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  
  // Status operations
  archiveClass: (id: string) => Promise<void>;
  unarchiveClass: (id: string) => Promise<void>;
  bulkArchive: (ids: string[]) => Promise<void>;
  
  // Teacher operations
  assignTeachers: (classId: string, teacherIds: string[]) => Promise<void>;
  removeTeacher: (classId: string, teacherId: string) => Promise<void>;
  bulkAssignTeacher: (classIds: string[], teacherId: string) => Promise<void>;
  
  // Student operations
  addStudents: (classId: string, studentIds: string[]) => Promise<void>;
  removeStudent: (classId: string, studentId: string) => Promise<void>;
  transferStudents: (fromClassId: string, toClassId: string, studentIds: string[]) => Promise<void>;
  
  // Selectors
  getFilteredClasses: (filters: ClassFilters) => SchoolClass[];
  getClassesByTeacher: (teacherId: string) => SchoolClass[];
  getClassesByStudent: (studentId: string) => SchoolClass[];
  getActiveClasses: () => SchoolClass[];
}

const STORAGE_KEY = 'comunika_classes';

const generateId = () => crypto.randomUUID();

const saveToStorage = (classes: SchoolClass[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
};

const loadFromStorage = (): SchoolClass[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const useClassStore = create<ClassStore>((set, get) => ({
  classes: [],
  loading: false,

  loadClasses: () => {
    const classes = loadFromStorage();
    if (classes.length === 0) {
      // Initialize with empty array - data will come from Supabase
      set({ classes: [] });
    } else {
      set({ classes });
    }
  },

  getClass: (id: string) => {
    return get().classes.find(c => c.id === id);
  },

  createClass: async (classData) => {
    // Validate and sanitize data
    const validation = validateClassData(classData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const newClass: SchoolClass = {
      ...validation.data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const classes = [...get().classes, newClass];
    set({ classes });
    saveToStorage(classes);
    
    // Log audit event
    const { logAudit } = await import('@/stores/audit-store');
    logAudit({
      action: 'CREATE',
      entity: 'CLASS',
      entity_id: newClass.id,
      entity_label: newClass.name,
      scope: `CLASS:${newClass.id}`,
      class_name: newClass.name,
      meta: { fields: ['name', 'code', 'year', 'grade'] },
      diff_json: {
        name: { before: null, after: newClass.name },
        code: { before: null, after: newClass.code },
        year: { before: null, after: newClass.year },
        grade: { before: null, after: newClass.grade }
      },
      actor_id: 'system',
      actor_name: 'Sistema',
      actor_email: 'system@escola.com',
      actor_role: 'SECRETARIA'
    });
    
    return newClass;
  },

  updateClass: async (id: string, updates) => {
    const currentClass = get().classes.find(c => c.id === id);
    if (!currentClass) throw new Error('Turma não encontrada');

    const mergedData = { ...currentClass, ...updates };
    const validation = validateClassData(mergedData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const classes = get().classes.map(c => 
      c.id === id 
        ? { ...validation.data, updatedAt: new Date().toISOString() }
        : c
    );
    set({ classes });
    saveToStorage(classes);
  },

  deleteClass: async (id: string) => {
    const classes = get().classes.filter(c => c.id !== id);
    set({ classes });
    saveToStorage(classes);
  },

  archiveClass: async (id: string) => {
    await get().updateClass(id, { status: 'ARQUIVADA' });
  },

  unarchiveClass: async (id: string) => {
    await get().updateClass(id, { status: 'ATIVA' });
  },

  bulkArchive: async (ids: string[]) => {
    const classes = get().classes.map(c => 
      ids.includes(c.id) 
        ? { ...c, status: 'ARQUIVADA' as ClassStatus, updatedAt: new Date().toISOString() }
        : c
    );
    set({ classes });
    saveToStorage(classes);
    
    // Log audit events for each archived class
    const { logAudit } = await import('@/stores/audit-store');
    const { useAuth } = await import('@/contexts/AuthContext');
    
    // Get current user - we'll need to pass this differently in a real implementation
    ids.forEach(classId => {
      const classData = classes.find(c => c.id === classId);
      if (classData) {
        // TODO: Get user from context properly
        logAudit({
          action: 'ARCHIVE',
          entity: 'CLASS',
          entity_id: classId,
          entity_label: classData.name,
          scope: `CLASS:${classId}`,
          class_name: classData.name,
          meta: { 
            fields: ['status'],
            status_before: 'ATIVA',
            status_after: 'ARQUIVADA'
          },
          diff_json: {
            status: { before: 'ATIVA', after: 'ARQUIVADA' }
          },
          // Placeholder user - will be replaced with proper user context
          actor_id: 'system',
          actor_name: 'Sistema',
          actor_email: 'system@escola.com',
          actor_role: 'SECRETARIA'
        });
      }
    });
  },

  assignTeachers: async (classId: string, teacherIds: string[]) => {
    await get().updateClass(classId, { teachers: teacherIds });
  },

  removeTeacher: async (classId: string, teacherId: string) => {
    const schoolClass = get().getClass(classId);
    if (schoolClass) {
      const teachers = schoolClass.teachers.filter(id => id !== teacherId);
      await get().updateClass(classId, { teachers });
    }
  },

  bulkAssignTeacher: async (classIds: string[], teacherId: string) => {
    const classes = get().classes.map(c => 
      classIds.includes(c.id) 
        ? { 
            ...c, 
            teachers: [...new Set([...c.teachers, teacherId])],
            updatedAt: new Date().toISOString() 
          }
        : c
    );
    set({ classes });
    saveToStorage(classes);
  },

  addStudents: async (classId: string, studentIds: string[]) => {
    const schoolClass = get().getClass(classId);
    if (schoolClass) {
      const students = [...new Set([...schoolClass.students, ...studentIds])];
      await get().updateClass(classId, { students });
    }
  },

  removeStudent: async (classId: string, studentId: string) => {
    const schoolClass = get().getClass(classId);
    if (schoolClass) {
      const students = schoolClass.students.filter(id => id !== studentId);
      await get().updateClass(classId, { students });
    }
  },

  transferStudents: async (fromClassId: string, toClassId: string, studentIds: string[]) => {
    const fromClass = get().getClass(fromClassId);
    const toClass = get().getClass(toClassId);
    
    if (fromClass && toClass) {
      // Remove from source
      const fromStudents = fromClass.students.filter(id => !studentIds.includes(id));
      await get().updateClass(fromClassId, { students: fromStudents });
      
      // Add to destination
      const toStudents = [...new Set([...toClass.students, ...studentIds])];
      await get().updateClass(toClassId, { students: toStudents });
    }
  },

  getFilteredClasses: (filters: ClassFilters) => {
    const classes = get().classes;
    return classes.filter(c => {
      if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !c.code?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.year && c.year !== filters.year) return false;
      if (filters.grade && c.grade !== filters.grade) return false;
      if (filters.teacher && !c.teachers.includes(filters.teacher)) return false;
      if (filters.status && c.status !== filters.status) return false;
      if (filters.levelId && c.levelId !== filters.levelId) return false;
      if (filters.modalityId && c.modalityId !== filters.modalityId) return false;
      return true;
    });
  },

  getClassesByTeacher: (teacherId: string) => {
    return get().classes.filter(c => c.status === 'ATIVA' && c.teachers.includes(teacherId));
  },

  getClassesByStudent: (studentId: string) => {
    return get().classes.filter(c => c.status === 'ATIVA' && c.students.includes(studentId));
  },

  getActiveClasses: () => {
    return get().classes.filter(c => c.status === 'ATIVA');
  },
}));
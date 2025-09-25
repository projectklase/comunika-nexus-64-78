import { create } from 'zustand';
import { Person, Guardian, StudentExtra, TeacherExtra } from '@/types/class';
import { validatePersonData, ValidationResult } from '@/lib/data-hygiene';

interface PeopleStore {
  people: Person[];
  loading: boolean;
  lastCreatedId: string | null;
  
  loadPeople: () => void;
  getPerson: (id: string) => Person | undefined;
  createPerson: (person: Omit<Person, 'id' | 'createdAt'>) => Promise<Person>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  archivePerson: (id: string) => Promise<void>;
  
  // Student specific methods
  createStudent: (studentData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'> & { student: StudentExtra }) => Promise<Person>;
  updateStudent: (id: string, updates: Partial<Person> & { student?: Partial<StudentExtra> }) => Promise<void>;
  archiveStudent: (id: string) => Promise<void>;
  isMinor: (student: Person) => boolean;
  ensurePrimaryGuardian: (student: Person) => void;
  
  // Teacher specific methods
  createTeacher: (teacherData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'> & { teacher: TeacherExtra }) => Promise<Person>;
  updateTeacher: (id: string, updates: Partial<Person> & { teacher?: Partial<TeacherExtra> }) => Promise<void>;
  archiveTeacher: (id: string) => Promise<void>;
  listTeachers: (filters?: { query?: string; active?: boolean; classId?: string }) => Person[];
  
  // Selectors
  getTeachers: () => Person[];
  getStudents: () => Person[];
  getActiveStudents: () => Person[];
  getPeopleByRole: (role: 'PROFESSOR' | 'ALUNO') => Person[];
  getTeacherLoad: (teacherId: string) => number;
  importStudents: (csvData: string) => Promise<Person[]>;
}

const STORAGE_KEY = 'comunika_people_v2'; // v2 to force refresh

const generateId = () => crypto.randomUUID();

const saveToStorage = (people: Person[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
};

const loadFromStorage = (): Person[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : getMockPeople();
  } catch {
    return getMockPeople();
  }
};

const getMockPeople = (): Person[] => [
  // Professores - incluindo o do AuthContext
  { 
    id: 'prof-joao', 
    name: 'João Santos', 
    email: 'professor@comunika.com', 
    role: 'PROFESSOR', 
    isActive: true, 
    createdAt: '2024-01-01T00:00:00Z',
    teacher: {
      document: '123.456.789-00',
      phones: ['(11) 99999-0001'],
      email: 'professor@comunika.com',
      qualifications: ['Licenciatura em Matemática', 'Mestrado em Educação'],
      specialties: ['Matemática', 'Física'],
      workloadHours: 40,
      availability: {
        daysOfWeek: ['segunda', 'terça', 'quarta', 'quinta', 'sexta'],
        startTime: '07:00',
        endTime: '17:00'
      },
      classIds: ['class-3a', 'class-2b'], // Turmas atribuídas
      hiredAt: '2024-01-01',
      notes: 'Professor de Matemática e Física'
    }
  },
  { id: '1', name: 'Ana Silva', email: 'ana.silva@escola.com', role: 'PROFESSOR', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'Carlos Santos', email: 'carlos.santos@escola.com', role: 'PROFESSOR', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  // Alunos com dados StudentExtra
  { 
    id: '3', 
    name: 'Ana Costa', 
    email: 'aluno@comunika.com', 
    role: 'ALUNO', 
    isActive: true, 
    createdAt: '2024-01-01T00:00:00Z',
    student: {
      dob: '2007-05-15',
      phones: ['(11) 99999-3333'],
      email: 'aluno@comunika.com'
    }
  },
  { id: '13', name: 'Maria Oliveira', email: 'maria.oliveira@escola.com', role: 'PROFESSOR', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: '4', name: 'João Costa', email: 'joao.costa@escola.com', role: 'PROFESSOR', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: '5', name: 'Paula Lima', email: 'paula.lima@escola.com', role: 'PROFESSOR', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { 
    id: '6', 
    name: 'Pedro Almeida', 
    role: 'ALUNO', 
    isActive: true, 
    createdAt: '2024-01-01T00:00:00Z',
    student: {
      dob: '2010-03-15',
      phones: ['(11) 99999-1234'],
      email: 'pedro.almeida@estudante.com',
      guardians: [
        {
          id: generateId(),
          name: 'Maria Almeida',
          relation: 'MAE',
          phone: '(11) 99999-5678',
          isPrimary: true
        }
      ]
    }
  },
  { 
    id: '7', 
    name: 'Ana Beatriz', 
    role: 'ALUNO', 
    isActive: true, 
    createdAt: '2024-01-01T00:00:00Z',
    student: {
      dob: '2005-07-22',
      phones: ['(11) 88888-1234'],
      email: 'ana.beatriz@estudante.com'
    }
  },
  { 
    id: '8', 
    name: 'Lucas Ferreira', 
    role: 'ALUNO', 
    isActive: true, 
    createdAt: '2024-01-01T00:00:00Z',
    student: {
      dob: '2008-11-08',
      phones: ['(11) 77777-1234'],
      guardians: [
        {
          id: generateId(),
          name: 'Carlos Ferreira',
          relation: 'PAI',
          phone: '(11) 77777-5678',
          isPrimary: true
        }
      ]
    }
  },
  { 
    id: '9', 
    name: 'Sophia Rodrigues', 
    role: 'ALUNO', 
    isActive: true, 
    createdAt: '2024-01-01T00:00:00Z',
    student: {
      dob: '2009-01-12',
      phones: ['(11) 66666-1234'],
      guardians: [
        {
          id: generateId(),
          name: 'Julia Rodrigues',
          relation: 'MAE',
          phone: '(11) 66666-5678',
          isPrimary: true
        }
      ]
    }
  },
  { 
    id: '10', 
    name: 'Gabriel Martins', 
    role: 'ALUNO', 
    isActive: true, 
    createdAt: '2024-01-01T00:00:00Z',
    student: {
      dob: '2006-05-30',
      phones: ['(11) 55555-1234'],
      email: 'gabriel.martins@estudante.com'
    }
  }
];

export const usePeopleStore = create<PeopleStore>((set, get) => ({
  people: [],
  loading: false,
  lastCreatedId: null,

  loadPeople: () => {
    const people = loadFromStorage();
    set({ people });
    // Save mock data if first time
    if (!localStorage.getItem(STORAGE_KEY)) {
      saveToStorage(people);
    }
  },

  getPerson: (id: string) => {
    return get().people.find(p => p.id === id);
  },

  createPerson: async (personData) => {
    // Validate and sanitize data
    const validation = validatePersonData(personData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const newPerson: Person = {
      ...validation.data,
      id: generateId(),
      isActive: validation.data.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const people = [...get().people, newPerson];
    set({ people, lastCreatedId: newPerson.id });
    saveToStorage(people);
    return newPerson;
  },

  updatePerson: async (id: string, updates) => {
    const currentPerson = get().people.find(p => p.id === id);
    if (!currentPerson) throw new Error('Pessoa não encontrada');

    const mergedData = { ...currentPerson, ...updates };
    const validation = validatePersonData(mergedData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const people = get().people.map(p => 
      p.id === id ? { ...validation.data, updatedAt: new Date().toISOString() } : p
    );
    set({ people });
    saveToStorage(people);
  },

  createStudent: async (studentData) => {
    // Validate and sanitize data
    const validation = validatePersonData(studentData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const newStudent: Person = {
      ...validation.data,
      id: generateId(),
      isActive: validation.data.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const people = [...get().people, newStudent];
    set({ people });
    saveToStorage(people);
    
    // Update class enrollments if classIds provided
    if (studentData.student.classIds?.length) {
      const classesData = localStorage.getItem('comunika_classes');
      if (classesData) {
        const classes = JSON.parse(classesData);
        const updatedClasses = classes.map(c => 
          studentData.student.classIds?.includes(c.id)
            ? { ...c, students: [...new Set([...c.students, newStudent.id])] }
            : c
        );
        localStorage.setItem('comunika_classes', JSON.stringify(updatedClasses));
      }
    }
    
    return newStudent;
  },

  updateStudent: async (id: string, updates) => {
    const currentStudent = get().people.find(p => p.id === id);
    if (!currentStudent || currentStudent.role !== 'ALUNO') return;

    const mergedData = {
      ...currentStudent,
      ...updates,
      student: currentStudent.student ? { ...currentStudent.student, ...updates.student } : updates.student
    };

    const validation = validatePersonData(mergedData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const people = get().people.map(p => 
      p.id === id ? { ...validation.data, updatedAt: new Date().toISOString() } : p
    );
    set({ people });
    saveToStorage(people);

    // Update class enrollments if classIds changed
    if (updates.student?.classIds) {
      const classesData = localStorage.getItem('comunika_classes');
      if (classesData) {
        const classes = JSON.parse(classesData);
        const updatedClasses = classes.map(c => {
          const shouldInclude = updates.student.classIds?.includes(c.id);
          const currentlyIncluded = c.students.includes(id);
          
          if (shouldInclude && !currentlyIncluded) {
            return { ...c, students: [...c.students, id] };
          } else if (!shouldInclude && currentlyIncluded) {
            return { ...c, students: c.students.filter(sid => sid !== id) };
          }
          return c;
        });
        localStorage.setItem('comunika_classes', JSON.stringify(updatedClasses));
      }
    }
  },

  archiveStudent: async (id: string) => {
    await get().updateStudent(id, { isActive: false });
  },

  createTeacher: async (teacherData) => {
    // Validate and sanitize data
    const validation = validatePersonData(teacherData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const newTeacher: Person = {
      ...validation.data,
      id: generateId(),
      isActive: validation.data.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const people = [...get().people, newTeacher];
    set({ people });
    saveToStorage(people);
    return newTeacher;
  },

  updateTeacher: async (id: string, updates) => {
    const currentTeacher = get().people.find(p => p.id === id);
    if (!currentTeacher || currentTeacher.role !== 'PROFESSOR') return;

    const mergedData = {
      ...currentTeacher,
      ...updates,
      teacher: currentTeacher.teacher ? { ...currentTeacher.teacher, ...updates.teacher } : updates.teacher
    };

    const validation = validatePersonData(mergedData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const people = get().people.map(p => 
      p.id === id ? { ...validation.data, updatedAt: new Date().toISOString() } : p
    );
    set({ people });
    saveToStorage(people);
  },

  archiveTeacher: async (id: string) => {
    await get().updateTeacher(id, { isActive: false });
  },

  listTeachers: (filters) => {
    const teachers = get().people.filter(p => p.role === 'PROFESSOR');
    
    if (!filters) return teachers;
    
    let filtered = teachers;
    
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.teacher?.email?.toLowerCase().includes(query) ||
        t.email?.toLowerCase().includes(query)
      );
    }
    
    if (filters.active !== undefined) {
      filtered = filtered.filter(t => t.isActive === filters.active);
    }
    
    if (filters.classId) {
      filtered = filtered.filter(t => 
        t.teacher?.classIds?.includes(filters.classId)
      );
    }
    
    return filtered;
  },

  isMinor: (student: Person) => {
    if (!student.student?.dob) return false;
    const today = new Date();
    const birthDate = new Date(student.student.dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 < 18;
    }
    return age < 18;
  },

  ensurePrimaryGuardian: (student: Person) => {
    if (!student.student?.guardians?.length) return;
    
    const hasPrimary = student.student.guardians.some(g => g.isPrimary);
    if (!hasPrimary && student.student.guardians.length > 0) {
      student.student.guardians[0].isPrimary = true;
    }
  },

  deletePerson: async (id: string) => {
    const people = get().people.filter(p => p.id !== id);
    set({ people });
    saveToStorage(people);
  },

  archivePerson: async (id: string) => {
    await get().updatePerson(id, { isActive: false });
  },

  getTeachers: () => {
    return get().people.filter(p => p.role === 'PROFESSOR' && p.isActive);
  },

  getStudents: () => {
    return get().people.filter(p => p.role === 'ALUNO');
  },

  getActiveStudents: () => {
    return get().people.filter(p => p.role === 'ALUNO' && p.isActive);
  },

  getPeopleByRole: (role: 'PROFESSOR' | 'ALUNO') => {
    return get().people.filter(p => p.role === role);
  },

  getTeacherLoad: (teacherId: string) => {
    // Get classes from localStorage directly to avoid circular dependency
    const classesData = localStorage.getItem('comunika_classes');
    const classes = classesData ? JSON.parse(classesData) : [];
    return classes.filter(c => c.teachers.includes(teacherId) && c.status === 'ATIVA').length;
  },

  importStudents: async (csvData: string) => {
    // Get class store data from localStorage to avoid circular dependency
    const classesData = localStorage.getItem('comunika_classes');
    const classes = classesData ? JSON.parse(classesData) : [];
    const lines = csvData.trim().split('\n');
    const newStudents: Person[] = [];
    
    for (const line of lines) {
      const [name, email, classCodesStr] = line.split(';').map(s => s.trim());
      if (name) {
        const student = await get().createPerson({
          name,
          email: email || undefined,
          role: 'ALUNO',
          isActive: true
        });
        
        // Vincular às turmas pelos códigos
        if (classCodesStr) {
          const classCodes = classCodesStr.split(',').map(s => s.trim());
          for (const code of classCodes) {
            const schoolClass = classes.find(c => c.code === code);
            if (schoolClass) {
              // Add student to class by updating the classes array
              const updatedClasses = classes.map(c => 
                c.id === schoolClass.id 
                  ? { ...c, students: [...new Set([...c.students, student.id])] }
                  : c
              );
              localStorage.setItem('comunika_classes', JSON.stringify(updatedClasses));
            }
          }
        }
        
        newStudents.push(student);
      }
    }
    
    return newStudents;
  },
}));
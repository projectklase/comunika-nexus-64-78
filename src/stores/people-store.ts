import { create } from 'zustand';
import { Person, Guardian, StudentExtra, TeacherExtra } from '@/types/class';
import { validatePersonData, ValidationResult } from '@/lib/data-hygiene';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Helper to map Supabase row to Person
const dbRowToPerson = async (row: any): Promise<Person> => {
  const person: Person = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role === 'aluno' ? 'ALUNO' : row.role === 'professor' ? 'PROFESSOR' : row.role.toUpperCase(),
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Load student-specific data
  if (person.role === 'ALUNO') {
    const { data: guardians } = await (supabase as any)
      .from('guardians')
      .select('*')
      .eq('student_id', row.id);

    // Get class IDs from class_students
    const { data: classLinks } = await (supabase as any)
      .from('class_students')
      .select('class_id')
      .eq('student_id', row.id);

    person.student = {
      dob: row.dob,
      phones: row.phone ? [row.phone] : [],
      email: row.email,
      classIds: classLinks?.map((cl: any) => cl.class_id) || [],
      guardians: guardians?.map((g: any) => ({
        id: g.id,
        name: g.name,
        relation: g.relation,
        phone: g.phone,
        email: g.email,
        isPrimary: g.is_primary
      })) || []
    };
  }

  return person;
};

export const usePeopleStore = create<PeopleStore>((set, get) => ({
  people: [],
  loading: false,
  lastCreatedId: null,

  loadPeople: async () => {
    set({ loading: true });
    try {
      // Primeiro, buscar IDs de estudantes
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'aluno');

      if (rolesError) {
        console.error('Error loading student roles:', rolesError);
        throw rolesError;
      }

      const studentIds = studentRoles?.map(r => r.user_id) || [];
      
      if (studentIds.length === 0) {
        set({ people: [], loading: false });
        return;
      }

      // Depois, buscar profiles desses IDs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }

      const people: Person[] = [];
      if (profiles) {
        for (const row of profiles) {
          const person = await dbRowToPerson(row);
          people.push(person);
        }
      }

      set({ people, loading: false });
    } catch (error) {
      console.error('Error loading people:', error);
      toast.error('Erro ao carregar pessoas');
      set({ loading: false });
    }
  },

  getPerson: (id: string) => {
    return get().people.find(p => p.id === id);
  },

  createPerson: async (personData) => {
    const validation = validatePersonData(personData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    set({ loading: true });
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .insert([{
          name: validation.data.name,
          email: validation.data.email || '',
          role: validation.data.role.toLowerCase(),
          is_active: validation.data.isActive ?? true
        }])
        .select()
        .single();

      if (error) throw error;

      const newPerson = await dbRowToPerson(data);
      set({ 
        people: [...get().people, newPerson], 
        lastCreatedId: newPerson.id,
        loading: false 
      });
      
      toast.success('Pessoa criada com sucesso');
      return newPerson;
    } catch (error) {
      console.error('Error creating person:', error);
      toast.error('Erro ao criar pessoa');
      set({ loading: false });
      throw error;
    }
  },

  updatePerson: async (id: string, updates) => {
    const currentPerson = get().people.find(p => p.id === id);
    if (!currentPerson) throw new Error('Pessoa não encontrada');

    const mergedData = { ...currentPerson, ...updates };
    const validation = validatePersonData(mergedData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    set({ loading: true });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: validation.data.name,
          email: validation.data.email || '',
          is_active: validation.data.isActive
        })
        .eq('id', id);

      if (error) throw error;

      const updatedPerson = await dbRowToPerson({ ...currentPerson, ...validation.data });
      const people = get().people.map(p => p.id === id ? updatedPerson : p);
      set({ people, loading: false });
      
      toast.success('Pessoa atualizada com sucesso');
    } catch (error) {
      console.error('Error updating person:', error);
      toast.error('Erro ao atualizar pessoa');
      set({ loading: false });
      throw error;
    }
  },

  createStudent: async (studentData) => {
    const validation = validatePersonData(studentData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    set({ loading: true });
    try {
      // Create profile
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .insert([{
          name: validation.data.name,
          email: validation.data.email || '',
          role: 'aluno',
          phone: studentData.student?.phones?.[0],
          is_active: validation.data.isActive ?? true,
          dob: studentData.student?.dob
        }])
        .select()
        .single();

      if (profileError) throw profileError;

      // Create guardians if provided
      if (studentData.student?.guardians?.length) {
        const guardiansToInsert = studentData.student.guardians.map(g => ({
          student_id: profile.id,
          name: g.name,
          relation: g.relation,
          phone: g.phone,
          email: g.email,
          is_primary: g.isPrimary
        }));

        const { error: guardianError } = await (supabase as any)
          .from('guardians')
          .insert(guardiansToInsert);

        if (guardianError) throw guardianError;
      }

      // Link to classes if provided
      if (studentData.student?.classIds?.length) {
        const classLinks = studentData.student.classIds.map(classId => ({
          student_id: profile.id,
          class_id: classId
        }));

        const { error: linkError } = await (supabase as any)
          .from('class_students')
          .insert(classLinks);

        if (linkError) throw linkError;
      }

      const newStudent = await dbRowToPerson(profile);
      set({ 
        people: [...get().people, newStudent],
        loading: false 
      });
      
      toast.success('Aluno criado com sucesso');
      return newStudent;
    } catch (error) {
      console.error('Error creating student:', error);
      toast.error('Erro ao criar aluno');
      set({ loading: false });
      throw error;
    }
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

    set({ loading: true });
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: validation.data.name,
          email: validation.data.email || '',
          phone: updates.student?.phones?.[0],
          is_active: validation.data.isActive,
          dob: updates.student?.dob
        })
        .eq('id', id);

      if (profileError) throw profileError;

      // Update guardians if provided
      if (updates.student?.guardians) {
        // Delete existing guardians
        await (supabase as any)
          .from('guardians')
          .delete()
          .eq('student_id', id);

        // Insert new guardians
        if (updates.student.guardians.length > 0) {
          const guardiansToInsert = updates.student.guardians.map(g => ({
            student_id: id,
            name: g.name,
            relation: g.relation,
            phone: g.phone,
            email: g.email,
            is_primary: g.isPrimary
          }));

          const { error: guardianError } = await (supabase as any)
            .from('guardians')
            .insert(guardiansToInsert);

          if (guardianError) throw guardianError;
        }
      }

      // Update class links if provided
      if (updates.student?.classIds !== undefined) {
        // Delete existing links
        await (supabase as any)
          .from('class_students')
          .delete()
          .eq('student_id', id);

        // Insert new links
        if (updates.student.classIds.length > 0) {
          const classLinks = updates.student.classIds.map(classId => ({
            student_id: id,
            class_id: classId
          }));

          const { error: linkError } = await (supabase as any)
            .from('class_students')
            .insert(classLinks);

          if (linkError) throw linkError;
        }
      }

      const updatedStudent = await dbRowToPerson({ ...currentStudent, ...validation.data });
      const people = get().people.map(p => p.id === id ? updatedStudent : p);
      set({ people, loading: false });
      
      toast.success('Aluno atualizado com sucesso');
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Erro ao atualizar aluno');
      set({ loading: false });
      throw error;
    }
  },

  archiveStudent: async (id: string) => {
    await get().updateStudent(id, { isActive: false });
  },

  createTeacher: async (teacherData) => {
    // Teachers are now created via Supabase edge function or admin panel
    throw new Error('Teacher creation should be done via Supabase admin');
  },

  updateTeacher: async (id: string, updates) => {
    // Teachers are now managed via Supabase
    throw new Error('Teacher updates should be done via useTeachers hook');
  },

  archiveTeacher: async (id: string) => {
    await get().updateTeacher(id, { isActive: false });
  },

  listTeachers: (filters) => {
    // Professores agora vêm do Supabase, não do store local
    return [];
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
    set({ loading: true });
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const people = get().people.filter(p => p.id !== id);
      set({ people, loading: false });
      
      toast.success('Pessoa removida com sucesso');
    } catch (error) {
      console.error('Error deleting person:', error);
      toast.error('Erro ao remover pessoa');
      set({ loading: false });
      throw error;
    }
  },

  archivePerson: async (id: string) => {
    await get().updatePerson(id, { isActive: false });
  },

  getTeachers: () => {
    // Professores agora vêm do Supabase, não do store local
    return [];
  },

  getStudents: () => {
    return get().people.filter(p => p.role === 'ALUNO');
  },

  getActiveStudents: () => {
    return get().people.filter(p => p.role === 'ALUNO' && p.isActive);
  },

  getPeopleByRole: (role: 'PROFESSOR' | 'ALUNO') => {
    if (role === 'PROFESSOR') {
      // Professores agora vêm do Supabase, não do store local
      return [];
    }
    return get().people.filter(p => p.role === role);
  },

  getTeacherLoad: (teacherId: string) => {
    // Get classes from localStorage directly to avoid circular dependency
    const classesData = localStorage.getItem('comunika_classes');
    const classes = classesData ? JSON.parse(classesData) : [];
    return classes.filter(c => c.teachers.includes(teacherId) && c.status === 'ATIVA').length;
  },

  importStudents: async (csvData: string) => {
    set({ loading: true });
    try {
      // Get classes from Supabase
      const { data: classes } = await supabase
        .from('classes')
        .select('id, code');

      const lines = csvData.trim().split('\n');
      const newStudents: Person[] = [];
      
      for (const line of lines) {
        const [name, email, classCodesStr] = line.split(';').map(s => s.trim());
        if (name) {
          // Create student profile
          const { data: profile, error: profileError } = await (supabase as any)
            .from('profiles')
            .insert([{
              name,
              email: email || 'temp@temp.com',
              role: 'aluno',
              is_active: true
            }])
            .select()
            .single();

          if (profileError) {
            console.error('Error creating student:', profileError);
            continue;
          }

          // Link to classes by code
          if (classCodesStr && classes) {
            const classCodes = classCodesStr.split(',').map(s => s.trim());
            const classIds = classes
              .filter(c => classCodes.includes(c.code))
              .map(c => c.id);

            if (classIds.length > 0) {
              const classLinks = classIds.map(classId => ({
                student_id: profile.id,
                class_id: classId
              }));

              await (supabase as any)
                .from('class_students')
                .insert(classLinks);
            }
          }

          const student = await dbRowToPerson(profile);
          newStudents.push(student);
        }
      }
      
      set({ 
        people: [...get().people, ...newStudents],
        loading: false 
      });
      
      toast.success(`${newStudents.length} alunos importados com sucesso`);
      return newStudents;
    } catch (error) {
      console.error('Error importing students:', error);
      toast.error('Erro ao importar alunos');
      set({ loading: false });
      throw error;
    }
  },
}));
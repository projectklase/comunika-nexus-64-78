import { create } from 'zustand';
import { SchoolClass, ClassStatus, ClassFilters } from '@/types/class';
import { validateClassData } from '@/lib/data-hygiene';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAudit } from './audit-store';

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

// Helper to convert DB row to SchoolClass
const dbRowToClass = (row: any): SchoolClass => ({
  id: row.id,
  name: row.name,
  code: row.code || undefined,
  grade: row.series || undefined,
  year: row.year,
  status: row.status === 'Ativa' ? 'ATIVA' : 'ARQUIVADA',
  levelId: row.level_id || undefined,
  modalityId: row.modality_id || undefined,
  subjectIds: [], // Will be populated from class_subjects
  daysOfWeek: row.week_days || [],
  startTime: row.start_time || '',
  endTime: row.end_time || '',
  teachers: row.main_teacher_id ? [row.main_teacher_id] : [],
  students: [], // Will be populated from class_students
  createdAt: row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at || new Date().toISOString(),
});

export const useClassStore = create<ClassStore>((set, get) => ({
  classes: [],
  loading: false,

  loadClasses: async () => {
    set({ loading: true });
    try {
      const { data: classesData, error } = await (supabase as any)
        .from('classes')
        .select('*')
        .order('name');

      if (error) throw error;

      // Fetch related data
      const [classSubjectsRes, classStudentsRes] = await Promise.all([
        (supabase as any).from('class_subjects').select('class_id, subject_id'),
        (supabase as any).from('class_students').select('class_id, student_id'),
      ]);

      // Group subjects per class
      const classSubjectsMap = new Map<string, string[]>();
      classSubjectsRes.data?.forEach((cs) => {
        if (!classSubjectsMap.has(cs.class_id)) {
          classSubjectsMap.set(cs.class_id, []);
        }
        classSubjectsMap.get(cs.class_id)?.push(cs.subject_id);
      });

      // Group students per class
      const classStudentsMap = new Map<string, string[]>();
      classStudentsRes.data?.forEach((cs) => {
        if (!classStudentsMap.has(cs.class_id)) {
          classStudentsMap.set(cs.class_id, []);
        }
        classStudentsMap.get(cs.class_id)?.push(cs.student_id);
      });

      const classes: SchoolClass[] = (classesData || []).map((row) => ({
        ...dbRowToClass(row),
        subjectIds: classSubjectsMap.get(row.id) || [],
        students: classStudentsMap.get(row.id) || [],
      }));

      set({ classes, loading: false });
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Erro ao carregar turmas');
      set({ loading: false });
    }
  },

  getClass: (id: string) => {
    return get().classes.find(c => c.id === id);
  },

  createClass: async (classData) => {
    const validation = validateClassData(classData);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    try {
      const insertData = {
        name: classData.name,
        code: classData.code,
        series: classData.grade,
        year: classData.year || new Date().getFullYear(),
        status: classData.status === 'ATIVA' ? 'Ativa' : 'Arquivada',
        level_id: classData.levelId,
        modality_id: classData.modalityId,
        week_days: classData.daysOfWeek,
        start_time: classData.startTime,
        end_time: classData.endTime,
        main_teacher_id: classData.teachers[0] || null,
      };

      const { data: newClass, error } = await (supabase as any)
        .from('classes')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Insert subjects
      if (classData.subjectIds && classData.subjectIds.length > 0) {
        const classSubjects = classData.subjectIds.map(subjectId => ({
          class_id: newClass.id,
          subject_id: subjectId,
        }));
        await (supabase as any).from('class_subjects').insert(classSubjects);
      }

      // Insert students
      if (classData.students && classData.students.length > 0) {
        const classStudents = classData.students.map(studentId => ({
          class_id: newClass.id,
          student_id: studentId,
        }));
        await (supabase as any).from('class_students').insert(classStudents);
      }

      await get().loadClasses();
      toast.success('Turma criada com sucesso');
      
      return dbRowToClass(newClass);
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast.error(error.message || 'Erro ao criar turma');
      throw error;
    }
  },

  updateClass: async (id: string, updates) => {
    try {
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.code !== undefined) updateData.code = updates.code;
      if (updates.grade !== undefined) updateData.series = updates.grade;
      if (updates.year !== undefined) updateData.year = updates.year;
      if (updates.status !== undefined) updateData.status = updates.status === 'ATIVA' ? 'Ativa' : 'Arquivada';
      if (updates.levelId !== undefined) updateData.level_id = updates.levelId;
      if (updates.modalityId !== undefined) updateData.modality_id = updates.modalityId;
      if (updates.daysOfWeek !== undefined) updateData.week_days = updates.daysOfWeek;
      if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
      if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
      if (updates.teachers !== undefined) updateData.main_teacher_id = updates.teachers[0] || null;

      const { error } = await (supabase as any)
        .from('classes')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update subjects if provided
      if (updates.subjectIds !== undefined) {
        await (supabase as any).from('class_subjects').delete().eq('class_id', id);
        if (updates.subjectIds.length > 0) {
          const classSubjects = updates.subjectIds.map(subjectId => ({
            class_id: id,
            subject_id: subjectId,
          }));
          await (supabase as any).from('class_subjects').insert(classSubjects);
        }
      }

      // Update students if provided
      if (updates.students !== undefined) {
        await (supabase as any).from('class_students').delete().eq('class_id', id);
        if (updates.students.length > 0) {
          const classStudents = updates.students.map(studentId => ({
            class_id: id,
            student_id: studentId,
          }));
          await (supabase as any).from('class_students').insert(classStudents);
        }
      }

      await get().loadClasses();
      toast.success('Turma atualizada');
    } catch (error: any) {
      console.error('Error updating class:', error);
      toast.error(error.message || 'Erro ao atualizar turma');
      throw error;
    }
  },

  deleteClass: async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await get().loadClasses();
      toast.success('Turma excluída');
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast.error(error.message || 'Erro ao excluir turma');
      throw error;
    }
  },

  archiveClass: async (id: string) => {
    await get().updateClass(id, { status: 'ARQUIVADA' });
  },

  unarchiveClass: async (id: string) => {
    await get().updateClass(id, { status: 'ATIVA' });
  },

  bulkArchive: async (ids: string[]) => {
    try {
      // Buscar dados do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single();

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      // Buscar nomes das turmas
      const { data: classData } = await (supabase as any)
        .from('classes')
        .select('id, name')
        .in('id', ids);

      const { error } = await (supabase as any)
        .from('classes')
        .update({ status: 'Arquivada' })
        .in('id', ids);

      if (error) throw error;

      // Log de auditoria para cada turma
      if (profile && userRole && classData) {
        for (const cls of classData) {
          await logAudit({
            actor_id: user.id,
            actor_name: profile.name,
            actor_email: profile.email,
            actor_role: userRole.role,
            action: 'ARCHIVE',
            entity: 'CLASS',
            entity_id: cls.id,
            entity_label: cls.name,
            scope: 'GLOBAL',
            meta: {
              archived_count: ids.length,
              operation: 'bulk_archive'
            }
          });
        }
      }

      await get().loadClasses();
      toast.success(`${ids.length} turma(s) arquivada(s)`);
    } catch (error: any) {
      console.error('Error archiving classes:', error);
      toast.error(error.message || 'Erro ao arquivar turmas');
      throw error;
    }
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
    try {
      // Buscar dados do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single();

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      // Buscar nomes das turmas e do professor
      const { data: classData } = await (supabase as any)
        .from('classes')
        .select('id, name')
        .in('id', classIds);

      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', teacherId)
        .single();

      const { error } = await (supabase as any)
        .from('classes')
        .update({ main_teacher_id: teacherId })
        .in('id', classIds);

      if (error) throw error;

      // Log de auditoria para cada turma
      if (profile && userRole && classData && teacherProfile) {
        for (const cls of classData) {
          await logAudit({
            actor_id: user.id,
            actor_name: profile.name,
            actor_email: profile.email,
            actor_role: userRole.role,
            action: 'ASSIGN',
            entity: 'TEACHER',
            entity_id: teacherId,
            entity_label: teacherProfile.name,
            scope: `CLASS:${cls.id}`,
            class_name: cls.name,
            meta: {
              teacher_name: teacherProfile.name,
              class_count: classIds.length,
              operation: 'bulk_assign_teacher'
            }
          });
        }
      }

      await get().loadClasses();
      toast.success('Professor atribuído às turmas');
    } catch (error: any) {
      console.error('Error assigning teacher:', error);
      toast.error(error.message || 'Erro ao atribuir professor');
      throw error;
    }
  },

  addStudents: async (classId: string, studentIds: string[]) => {
    try {
      const classStudents = studentIds.map(studentId => ({
        class_id: classId,
        student_id: studentId,
      }));

      const { error } = await (supabase as any)
        .from('class_students')
        .insert(classStudents);

      if (error) throw error;

      await get().loadClasses();
      toast.success('Alunos adicionados à turma');
    } catch (error: any) {
      console.error('Error adding students:', error);
      toast.error(error.message || 'Erro ao adicionar alunos');
      throw error;
    }
  },

  removeStudent: async (classId: string, studentId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('class_students')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentId);

      if (error) throw error;

      await get().loadClasses();
      toast.success('Aluno removido da turma');
    } catch (error: any) {
      console.error('Error removing student:', error);
      toast.error(error.message || 'Erro ao remover aluno');
      throw error;
    }
  },

  transferStudents: async (fromClassId: string, toClassId: string, studentIds: string[]) => {
    try {
      // Remove from source class
      await (supabase as any)
        .from('class_students')
        .delete()
        .eq('class_id', fromClassId)
        .in('student_id', studentIds);

      // Add to destination class
      const classStudents = studentIds.map(studentId => ({
        class_id: toClassId,
        student_id: studentId,
      }));

      const { error } = await (supabase as any)
        .from('class_students')
        .insert(classStudents);

      if (error) throw error;

      await get().loadClasses();
      toast.success('Alunos transferidos');
    } catch (error: any) {
      console.error('Error transferring students:', error);
      toast.error(error.message || 'Erro ao transferir alunos');
      throw error;
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
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Define types locally since the database types file may not be in sync yet
interface ClassRow {
  id: string;
  name: string;
  series?: string;
  code?: string;
  year: number;
  level_id?: string;
  modality_id?: string;
  main_teacher_id?: string;
  start_time?: string;
  end_time?: string;
  week_days?: string[];
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface ClassInsert extends Omit<ClassRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}

interface ClassUpdate extends Partial<Omit<ClassRow, 'id' | 'created_at' | 'updated_at'>> {
  updated_at?: string;
}

// Tipo compatível com SchoolClass da aplicação
export interface ClassWithRelations {
  id: string;
  name: string;
  code?: string;
  grade?: string;
  year: number;
  status: 'ATIVA' | 'ARQUIVADA';
  levelId?: string;
  modalityId?: string;
  subjectIds?: string[];
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  teachers: string[];
  students: string[];
  createdAt: string;
  updatedAt: string;
  // Campos extras para display
  level_name?: string;
  modality_name?: string;
  teacher_name?: string;
  subject_names?: string[];
  student_count?: number;
}

export function useClasses() {
  const [classes, setClasses] = useState<ClassWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClasses = async () => {
    try {
      setLoading(true);
      
      // Fetch classes - using type assertion to bypass type errors
      const { data: classesData, error: classesError } = await (supabase as any)
        .from('classes')
        .select('*')
        .order('name');

      if (classesError) throw classesError;

      // Fetch related data
      const [levelsRes, modalitiesRes, profilesRes, classSubjectsRes, subjectsRes, classStudentsRes] = await Promise.all([
        supabase.from('levels').select('id, name'),
        supabase.from('modalities').select('id, name'),
        supabase.from('profiles').select('id, name, role'),
        (supabase as any).from('class_subjects').select('class_id, subject_id'),
        supabase.from('subjects').select('id, name'),
        (supabase as any).from('class_students').select('class_id, student_id'),
      ]);

      // Create lookup maps
      const levelsMap = new Map(levelsRes.data?.map(l => [l.id, l.name]) || []);
      const modalitiesMap = new Map(modalitiesRes.data?.map(m => [m.id, m.name]) || []);
      const teachersMap = new Map(
        profilesRes.data?.filter(p => p.role === 'professor').map(p => [p.id, p.name]) || []
      );
      const subjectsMap = new Map(subjectsRes.data?.map(s => [s.id, s.name]) || []);

      // Group class subjects
      const classSubjectsMap = new Map<string, string[]>();
      classSubjectsRes.data?.forEach((cs: any) => {
        if (!classSubjectsMap.has(cs.class_id)) {
          classSubjectsMap.set(cs.class_id, []);
        }
        const subjectName = subjectsMap.get(cs.subject_id);
        if (subjectName) {
          classSubjectsMap.get(cs.class_id)?.push(subjectName);
        }
      });

      // Count students per class
      const studentCountMap = new Map<string, number>();
      classStudentsRes.data?.forEach((cs: any) => {
        studentCountMap.set(cs.class_id, (studentCountMap.get(cs.class_id) || 0) + 1);
      });

      // Combine data - converter snake_case para camelCase
      const classesWithRelations: ClassWithRelations[] = (classesData || []).map((cls: ClassRow) => ({
        id: cls.id,
        name: cls.name,
        code: cls.code || undefined,
        grade: cls.series || undefined,
        year: cls.year,
        status: cls.status === 'Ativa' ? 'ATIVA' : 'ARQUIVADA',
        levelId: cls.level_id || undefined,
        modalityId: cls.modality_id || undefined,
        subjectIds: classSubjectsMap.get(cls.id) || [],
        daysOfWeek: cls.week_days || [],
        startTime: cls.start_time || '',
        endTime: cls.end_time || '',
        teachers: cls.main_teacher_id ? [cls.main_teacher_id] : [],
        students: [], // será preenchido com os dados de class_students
        createdAt: cls.created_at || new Date().toISOString(),
        updatedAt: cls.updated_at || new Date().toISOString(),
        // Campos extras
        level_name: cls.level_id ? levelsMap.get(cls.level_id) : undefined,
        modality_name: cls.modality_id ? modalitiesMap.get(cls.modality_id) : undefined,
        teacher_name: cls.main_teacher_id ? teachersMap.get(cls.main_teacher_id) : undefined,
        subject_names: classSubjectsMap.get(cls.id) || [],
        student_count: studentCountMap.get(cls.id) || 0,
      }));

      setClasses(classesWithRelations);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast({
        title: 'Erro ao carregar turmas',
        description: 'Não foi possível carregar as turmas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const createClass = async (data: ClassInsert, subjectIds: string[] = []) => {
    try {
      console.log('🔵 [useClasses] Tentando criar turma:', data);
      console.log('🔵 [useClasses] SubjectIds:', subjectIds);
      
      // Insert class - using type assertion
      const { data: newClass, error: classError } = await (supabase as any)
        .from('classes')
        .insert(data)
        .select()
        .single();

      console.log('🔵 [useClasses] Resposta do insert class:', { newClass, classError });

      if (classError) {
        console.error('🔴 [useClasses] Erro ao criar turma:', classError);
        throw classError;
      }

      console.log('✅ [useClasses] Turma criada com sucesso:', newClass.id);

      // Insert class subjects
      if (subjectIds.length > 0) {
        const classSubjects = subjectIds.map(subjectId => ({
          class_id: newClass.id,
          subject_id: subjectId,
        }));

        console.log('🔵 [useClasses] Inserindo matérias:', classSubjects);

        const { error: subjectsError } = await (supabase as any)
          .from('class_subjects')
          .insert(classSubjects);

        if (subjectsError) {
          console.error('🔴 [useClasses] Erro ao inserir matérias:', subjectsError);
          throw subjectsError;
        }

        console.log('✅ [useClasses] Matérias inseridas com sucesso');
      }

      toast({
        title: 'Turma criada',
        description: 'A turma foi criada com sucesso.',
      });

      await loadClasses();
      return newClass;
    } catch (error: any) {
      console.error('🔴 [useClasses] Erro geral ao criar turma:', error);
      console.error('🔴 [useClasses] Detalhes do erro:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      toast({
        title: 'Erro ao criar turma',
        description: error.message || 'Não foi possível criar a turma.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateClass = async (id: string, updates: ClassUpdate, subjectIds?: string[]) => {
    try {
      // Update class - using type assertion
      const { error: classError } = await (supabase as any)
        .from('classes')
        .update(updates)
        .eq('id', id);

      if (classError) throw classError;

      // Update subjects if provided
      if (subjectIds !== undefined) {
        // Delete existing subjects
        await (supabase as any).from('class_subjects').delete().eq('class_id', id);

        // Insert new subjects
        if (subjectIds.length > 0) {
          const classSubjects = subjectIds.map(subjectId => ({
            class_id: id,
            subject_id: subjectId,
          }));

          const { error: subjectsError } = await (supabase as any)
            .from('class_subjects')
            .insert(classSubjects);

          if (subjectsError) throw subjectsError;
        }
      }

      toast({
        title: 'Turma atualizada',
        description: 'A turma foi atualizada com sucesso.',
      });

      await loadClasses();
    } catch (error) {
      console.error('Error updating class:', error);
      toast({
        title: 'Erro ao atualizar turma',
        description: 'Não foi possível atualizar a turma.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteClass = async (id: string) => {
    try {
      // Delete class (cascade will handle class_subjects and class_students)
      const { error } = await (supabase as any)
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Turma excluída',
        description: 'A turma foi excluída com sucesso.',
      });

      await loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        title: 'Erro ao excluir turma',
        description: 'Não foi possível excluir a turma.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const archiveClass = async (id: string) => {
    await updateClass(id, { status: 'Arquivada' });
  };

  const unarchiveClass = async (id: string) => {
    await updateClass(id, { status: 'Ativa' });
  };

  const addStudentsToClass = async (classId: string, studentIds: string[]) => {
    try {
      const classStudents = studentIds.map(studentId => ({
        class_id: classId,
        student_id: studentId,
      }));

      const { error } = await (supabase as any)
        .from('class_students')
        .insert(classStudents);

      if (error) throw error;

      toast({
        title: 'Alunos adicionados',
        description: 'Os alunos foram adicionados à turma.',
      });

      await loadClasses();
    } catch (error) {
      console.error('Error adding students:', error);
      toast({
        title: 'Erro ao adicionar alunos',
        description: 'Não foi possível adicionar os alunos.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeStudentFromClass = async (classId: string, studentId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('class_students')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentId);

      if (error) throw error;

      toast({
        title: 'Aluno removido',
        description: 'O aluno foi removido da turma.',
      });

      await loadClasses();
    } catch (error) {
      console.error('Error removing student:', error);
      toast({
        title: 'Erro ao remover aluno',
        description: 'Não foi possível remover o aluno.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const assignTeachers = async (classId: string, teacherIds: string[]) => {
    try {
      // For now, we'll update only the main_teacher_id with the first teacher
      // In the future, we might need a separate table for multiple teachers per class
      const mainTeacherId = teacherIds.length > 0 ? teacherIds[0] : null;

      const { error } = await (supabase as any)
        .from('classes')
        .update({ main_teacher_id: mainTeacherId })
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: 'Professores atribuídos',
        description: 'Os professores foram atribuídos com sucesso.',
      });

      await loadClasses();
    } catch (error) {
      console.error('Error assigning teachers:', error);
      toast({
        title: 'Erro ao atribuir professores',
        description: 'Não foi possível atribuir os professores.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    classes,
    loading,
    loadClasses,
    createClass,
    updateClass,
    deleteClass,
    archiveClass,
    unarchiveClass,
    addStudentsToClass,
    removeStudentFromClass,
    assignTeachers,
  };
}

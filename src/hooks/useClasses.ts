import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ClassRow = Database['public']['Tables']['classes']['Row'];
type ClassInsert = Database['public']['Tables']['classes']['Insert'];
type ClassUpdate = Database['public']['Tables']['classes']['Update'];

export interface ClassWithRelations extends ClassRow {
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
      
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (classesError) throw classesError;

      // Fetch related data
      const [levelsRes, modalitiesRes, profilesRes, classSubjectsRes, subjectsRes, classStudentsRes] = await Promise.all([
        supabase.from('levels').select('id, name'),
        supabase.from('modalities').select('id, name'),
        supabase.from('profiles').select('id, name, role'),
        supabase.from('class_subjects').select('class_id, subject_id'),
        supabase.from('subjects').select('id, name'),
        supabase.from('class_students').select('class_id, student_id'),
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
      classSubjectsRes.data?.forEach(cs => {
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
      classStudentsRes.data?.forEach(cs => {
        studentCountMap.set(cs.class_id, (studentCountMap.get(cs.class_id) || 0) + 1);
      });

      // Combine data
      const classesWithRelations: ClassWithRelations[] = (classesData || []).map(cls => ({
        ...cls,
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
      // Insert class
      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert(data)
        .select()
        .single();

      if (classError) throw classError;

      // Insert class subjects
      if (subjectIds.length > 0) {
        const classSubjects = subjectIds.map(subjectId => ({
          class_id: newClass.id,
          subject_id: subjectId,
        }));

        const { error: subjectsError } = await supabase
          .from('class_subjects')
          .insert(classSubjects);

        if (subjectsError) throw subjectsError;
      }

      toast({
        title: 'Turma criada',
        description: 'A turma foi criada com sucesso.',
      });

      await loadClasses();
      return newClass;
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        title: 'Erro ao criar turma',
        description: 'Não foi possível criar a turma.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateClass = async (id: string, updates: ClassUpdate, subjectIds?: string[]) => {
    try {
      // Update class
      const { error: classError } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', id);

      if (classError) throw classError;

      // Update subjects if provided
      if (subjectIds !== undefined) {
        // Delete existing subjects
        await supabase.from('class_subjects').delete().eq('class_id', id);

        // Insert new subjects
        if (subjectIds.length > 0) {
          const classSubjects = subjectIds.map(subjectId => ({
            class_id: id,
            subject_id: subjectId,
          }));

          const { error: subjectsError } = await supabase
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
      const { error } = await supabase
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

      const { error } = await supabase
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
      const { error } = await supabase
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
  };
}

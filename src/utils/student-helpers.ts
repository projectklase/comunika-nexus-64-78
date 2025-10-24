import { SchoolClass } from '@/types/class';
import { supabase } from '@/integrations/supabase/client';

/**
 * Obtém todas as turmas de um aluno diretamente do Supabase
 * Agora busca via class_students respeitando RLS
 */
export async function getStudentClasses(userId: string, schoolId?: string): Promise<SchoolClass[]> {
  try {
    // Get class IDs where student is enrolled
    const { data: enrollments, error: enrollError } = await (supabase as any)
      .from('class_students')
      .select('class_id')
      .eq('student_id', userId);

    if (enrollError) throw enrollError;
    if (!enrollments || enrollments.length === 0) return [];

    const classIds = enrollments.map((e: any) => e.class_id);

    // Get full class data
    const { data: classesData, error: classError } = await (supabase as any)
      .from('classes')
      .select('*')
      .in('id', classIds)
      .eq('status', 'Ativa');

    if (classError) throw classError;

    const classes: SchoolClass[] = (classesData || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code || undefined,
      grade: row.series || undefined,
      year: row.year,
      status: row.status === 'Ativa' ? 'ATIVA' : 'ARQUIVADA',
      levelId: row.level_id || undefined,
      modalityId: row.modality_id || undefined,
      subjectIds: [],
      daysOfWeek: row.week_days || [],
      startTime: row.start_time || '',
      endTime: row.end_time || '',
      teachers: row.main_teacher_id ? [row.main_teacher_id] : [],
      students: [],
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));

    return classes;
  } catch (error) {
    console.error('Error getting student classes:', error);
    return [];
  }
}

/**
 * Verifica se um aluno está matriculado em uma turma específica
 */
export async function isStudentOfClass(userId: string, classId: string): Promise<boolean> {
  const studentClasses = await getStudentClasses(userId);
  return studentClasses.some(c => c.id === classId);
}

/**
 * Conta métricas básicas para o dashboard do aluno
 */
export async function getStudentMetrics(userId: string) {
  const classes = await getStudentClasses(userId);
  const totalClasses = classes.length;
  
  return {
    totalClasses,
    totalSubjects: classes.reduce((subjects, c) => {
      c.subjectIds?.forEach(s => subjects.add(s));
      return subjects;
    }, new Set()).size
  };
}
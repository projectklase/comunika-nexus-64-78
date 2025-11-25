import { supabase } from '@/integrations/supabase/client';

interface AffectedClass {
  id: string;
  name: string;
  studentCount: number;
}

interface TeacherImpactResult {
  hasImpact: boolean;
  classes: AffectedClass[];
  totalClasses: number;
  totalStudents: number;
}

/**
 * Hook para verificar o impacto da remoção de um professor de uma escola
 */
export function useTeacherImpactCheck() {
  /**
   * Verifica se o professor tem turmas ativas em uma escola específica
   * e retorna detalhes sobre o impacto da remoção
   */
  const checkTeacherSchoolImpact = async (
    teacherId: string,
    schoolId: string
  ): Promise<TeacherImpactResult> => {
    console.log('🔍 [useTeacherImpactCheck] Verificando impacto:', { teacherId, schoolId });

    try {
      // 1. Buscar turmas ativas do professor nesta escola
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('main_teacher_id', teacherId)
        .eq('school_id', schoolId)
        .eq('status', 'Ativa');

      if (classesError) {
        console.error('❌ [useTeacherImpactCheck] Erro ao buscar turmas:', classesError);
        throw classesError;
      }

      if (!classes || classes.length === 0) {
        console.log('✅ [useTeacherImpactCheck] Nenhuma turma afetada');
        return {
          hasImpact: false,
          classes: [],
          totalClasses: 0,
          totalStudents: 0
        };
      }

      console.log(`📚 [useTeacherImpactCheck] Encontradas ${classes.length} turmas`);

      // 2. Para cada turma, buscar contagem de alunos
      const classIds = classes.map(c => c.id);
      const { data: studentCounts, error: studentsError } = await supabase
        .from('class_students')
        .select('class_id')
        .in('class_id', classIds);

      if (studentsError) {
        console.error('❌ [useTeacherImpactCheck] Erro ao contar alunos:', studentsError);
        throw studentsError;
      }

      // 3. Agrupar contagem por turma
      const studentCountMap: Record<string, number> = {};
      studentCounts?.forEach(record => {
        studentCountMap[record.class_id] = (studentCountMap[record.class_id] || 0) + 1;
      });

      // 4. Montar resultado com detalhes
      const affectedClasses: AffectedClass[] = classes.map(cls => ({
        id: cls.id,
        name: cls.name,
        studentCount: studentCountMap[cls.id] || 0
      }));

      const totalStudents = Object.values(studentCountMap).reduce((sum, count) => sum + count, 0);

      console.log('✅ [useTeacherImpactCheck] Impacto calculado:', {
        totalClasses: classes.length,
        totalStudents,
        affectedClasses
      });

      return {
        hasImpact: true,
        classes: affectedClasses,
        totalClasses: classes.length,
        totalStudents
      };
    } catch (error) {
      console.error('❌ [useTeacherImpactCheck] Erro ao verificar impacto:', error);
      throw error;
    }
  };

  return {
    checkTeacherSchoolImpact
  };
}

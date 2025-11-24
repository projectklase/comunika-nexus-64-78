import { SchoolClass } from '@/types/class';
import { useClassStore } from '@/stores/class-store';

/**
 * Obtém todas as turmas de um professor
 * Busca turmas onde o userId está no array teachers
 */
export function getProfessorClasses(userId: string, schoolId?: string): SchoolClass[] {
  const { classes } = useClassStore.getState();
  
  // ✅ GUARD: Log de debug
  console.log('🔵 [getProfessorClasses] Buscando turmas para userId:', userId, 'schoolId:', schoolId);
  
  // Filtrar turmas onde o professor está no array teachers
  let professorClasses = classes.filter(c => 
    c.teachers && c.teachers.includes(userId) && c.status === 'ATIVA'
  );
  
  // ✅ IMPLEMENTAR FILTRO DE ESCOLA (não mais TODO)
  if (schoolId) {
    professorClasses = professorClasses.filter(c => c.schoolId === schoolId);
    console.log('🔵 [getProfessorClasses] Turmas após filtro de escola:', professorClasses.length);
  } else {
    console.warn('⚠️ [getProfessorClasses] schoolId não fornecido - possível vazamento multi-tenant');
  }
  
  return professorClasses;
}

/**
 * Verifica se um professor está atribuído a uma turma específica
 */
export function isProfessorOfClass(userId: string, classId: string): boolean {
  const professorClasses = getProfessorClasses(userId);
  return professorClasses.some(c => c.id === classId);
}

/**
 * Conta métricas básicas para o dashboard do professor
 */
export function getProfessorMetrics(userId: string) {
  const classes = getProfessorClasses(userId);
  const totalClasses = classes.length;
  
  // Contar alunos únicos de todas as turmas
  const totalStudents = classes.reduce((sum, c) => sum + (c.students?.length || 0), 0);
  
  return {
    totalClasses,
    totalStudents,
    pendingDeliveries: 0, // Would need async hook to get real value
    weeklyDeadlines: 0 // Would need async hook to get real value
  };
}
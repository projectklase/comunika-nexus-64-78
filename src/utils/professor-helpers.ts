import { SchoolClass } from '@/types/class';
import { useClassStore } from '@/stores/class-store';

/**
 * Obtém todas as turmas de um professor
 * Busca turmas onde o userId está no array teachers
 */
export function getProfessorClasses(userId: string, schoolId?: string): SchoolClass[] {
  const { classes } = useClassStore.getState();
  
  // Filtrar turmas onde o professor está no array teachers
  const professorClasses = classes.filter(c => 
    c.teachers && c.teachers.includes(userId) && c.status === 'ATIVA'
  );
  
  // Filtrar por schoolId se fornecido (multi-tenant)
  if (schoolId) {
    // TODO: Implementar filtro por schoolId quando tiver esse campo
    // return professorClasses.filter(c => c.schoolId === schoolId);
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
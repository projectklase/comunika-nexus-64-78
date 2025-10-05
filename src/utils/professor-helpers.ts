import { SchoolClass } from '@/types/class';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { deliveryStore } from '@/stores/delivery-store';

/**
 * Obtém todas as turmas de um professor
 * Une classes onde professor está em teachers[] + classIds do teacher
 * Remove duplicatas e filtra por schoolId
 */
export function getProfessorClasses(userId: string, schoolId?: string): SchoolClass[] {
  const { classes } = useClassStore.getState();
  const { people } = usePeopleStore.getState();
  
  // Buscar o professor no PeopleStore
  const teacher = people.find(p => p.id === userId && p.role === 'PROFESSOR');
  
  // Conjunto para evitar duplicatas
  const classIds = new Set<string>();
  
  // A) Classes onde professor está em teachers[]
  classes.forEach(schoolClass => {
    if (schoolClass.teachers.includes(userId)) {
      classIds.add(schoolClass.id);
    }
  });
  
  // B) Classes listadas em teacher.classIds
  if (teacher?.teacher?.classIds) {
    teacher.teacher.classIds.forEach(id => classIds.add(id));
  }
  
  // Mapear IDs para objetos de classe e filtrar
  const professorClasses = Array.from(classIds)
    .map(id => classes.find(c => c.id === id))
    .filter((c): c is SchoolClass => c !== undefined)
    .filter(c => c.status === 'ATIVA'); // Apenas turmas ativas
  
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
  const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);
  
  // Return synchronously with default values (async loading handled by components)
  return {
    totalClasses,
    totalStudents,
    pendingDeliveries: 0, // Would need async hook to get real value
    weeklyDeadlines: 0 // Would need async hook to get real value
  };
}
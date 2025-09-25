import { SchoolClass } from '@/types/class';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';

/**
 * Obtém todas as turmas de um aluno
 */
export function getStudentClasses(userId: string, schoolId?: string): SchoolClass[] {
  const { classes } = useClassStore.getState();
  const { people } = usePeopleStore.getState();
  
  // Buscar o aluno no PeopleStore
  const student = people.find(p => p.id === userId && p.role === 'ALUNO');
  
  // Conjunto para evitar duplicatas
  const classIds = new Set<string>();
  
  // A) Classes onde aluno está em students[]
  classes.forEach(schoolClass => {
    if (schoolClass.students.includes(userId)) {
      classIds.add(schoolClass.id);
    }
  });
  
  // B) Classes listadas em student.classIds (se existir)
  if (student?.student?.classIds) {
    student.student.classIds.forEach(id => classIds.add(id));
  }
  
  // Mapear IDs para objetos de classe e filtrar
  const studentClasses = Array.from(classIds)
    .map(id => classes.find(c => c.id === id))
    .filter((c): c is SchoolClass => c !== undefined)
    .filter(c => c.status === 'ATIVA'); // Apenas turmas ativas
  
  // Filtrar por schoolId se fornecido (multi-tenant)
  if (schoolId) {
    // TODO: Implementar filtro por schoolId quando tiver esse campo
    // return studentClasses.filter(c => c.schoolId === schoolId);
  }
  
  return studentClasses;
}

/**
 * Verifica se um aluno está matriculado em uma turma específica
 */
export function isStudentOfClass(userId: string, classId: string): boolean {
  const studentClasses = getStudentClasses(userId);
  return studentClasses.some(c => c.id === classId);
}

/**
 * Conta métricas básicas para o dashboard do aluno
 */
export function getStudentMetrics(userId: string) {
  const classes = getStudentClasses(userId);
  const totalClasses = classes.length;
  
  return {
    totalClasses,
    totalSubjects: classes.reduce((subjects, c) => {
      c.subjectIds?.forEach(s => subjects.add(s));
      return subjects;
    }, new Set()).size
  };
}
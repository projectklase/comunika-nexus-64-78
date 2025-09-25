
import { useCallback } from 'react';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { useSubjectStore } from '@/stores/subject-store';
import { useClassSubjectStore } from '@/stores/class-subject-store';
import { ClassFilters } from '@/types/class';
import { toCsv, downloadCsv, formatDateTime } from '@/utils/csv';
import { useToast } from '@/hooks/use-toast';
import { resolveLevelName, resolveModalityName, resolveSubjectNames, formatDaysOfWeek, formatClassTime } from '@/utils/class-helpers';

export const useClassExport = () => {
  const { getFilteredClasses } = useClassStore();
  const { people, getPerson } = usePeopleStore();
  const { subjects, getSubject } = useSubjectStore();
  const { getClassSubjects } = useClassSubjectStore();
  const { toast } = useToast();

  // Criar mapas para performance
  const createMaps = useCallback(() => {
    const teachersMap = new Map();
    const studentsMap = new Map();
    
    people.forEach(person => {
      if (person.role === 'PROFESSOR') {
        teachersMap.set(person.id, person.name);
      } else if (person.role === 'ALUNO') {
        studentsMap.set(person.id, {
          name: person.name,
          email: person.email || ''
        });
      }
    });
    
    return { teachersMap, studentsMap };
  }, [people]);

  const exportClassesSummary = useCallback((filters: ClassFilters) => {
    const classes = getFilteredClasses(filters);
    const { teachersMap } = createMaps();
    
    const rows = classes.map(schoolClass => {
      const classSubjects = getClassSubjects(schoolClass.id);
      
      const subjectNames = resolveSubjectNames(schoolClass.subjectIds);
      
      return {
        class_id: schoolClass.id,
        turma: schoolClass.name,
        codigo: schoolClass.code || '',
        programa: schoolClass.programId || '',
        level: resolveLevelName(schoolClass.levelId),
        modality: resolveModalityName(schoolClass.modalityId),
        subjects: subjectNames.join(', '),
        days_of_week: formatDaysOfWeek(schoolClass.daysOfWeek),
        time: formatClassTime(schoolClass.startTime, schoolClass.endTime),
        nivel: schoolClass.levelId || '',
        ano: schoolClass.year || '',
        status: schoolClass.status,
        qtde_professores: schoolClass.teachers.length,
        qtde_alunos: schoolClass.students.length,
        qtde_materias: classSubjects.length,
        criada_em: schoolClass.createdAt,
        atualizada_em: schoolClass.updatedAt,
      };
    });

    const headers = [
      'class_id', 'turma', 'codigo', 'programa', 'level', 'modality', 'subjects', 'days_of_week', 'time',
      'nivel', 'ano', 'status', 'qtde_professores', 'qtde_alunos', 'qtde_materias',
      'criada_em', 'atualizada_em'
    ];

    const csv = toCsv(rows, headers);
    const filename = `turmas_resumo_${formatDateTime()}.csv`;
    
    downloadCsv(filename, csv);
    toast({ title: "Arquivo gerado com filtros aplicados" });
  }, [getFilteredClasses, createMaps, getClassSubjects, toast]);

  const exportClassesDetailed = useCallback((filters: ClassFilters) => {
    const classes = getFilteredClasses(filters);
    const { teachersMap } = createMaps();
    
    const rows: any[] = [];
    
    classes.forEach(schoolClass => {
      const classSubjects = getClassSubjects(schoolClass.id);
      
      if (classSubjects.length === 0) {
        // Se não há matérias, criar uma linha básica
        const subjectNames = resolveSubjectNames(schoolClass.subjectIds);
        
        rows.push({
          class_id: schoolClass.id,
          turma: schoolClass.name,
          codigo: schoolClass.code || '',
          programa: schoolClass.programId || '',
          level: resolveLevelName(schoolClass.levelId),
          modality: resolveModalityName(schoolClass.modalityId),
          subjects: subjectNames.join(', '),
          days_of_week: formatDaysOfWeek(schoolClass.daysOfWeek),
          time: formatClassTime(schoolClass.startTime, schoolClass.endTime),
          nivel: schoolClass.levelId || '',
          subject_id: '',
          materia: '',
          teacher_id: '',
          professor_nome: '',
          alunos_total_na_turma: schoolClass.students.length,
        });
      } else {
        // Uma linha por matéria
        const subjectNames = resolveSubjectNames(schoolClass.subjectIds);
        
        classSubjects.forEach(classSubject => {
          const subject = getSubject(classSubject.subjectId);
          const teacherName = classSubject.teacherId ? 
            teachersMap.get(classSubject.teacherId) || '' : '';
          
          rows.push({
            class_id: schoolClass.id,
            turma: schoolClass.name,
            codigo: schoolClass.code || '',
            programa: schoolClass.programId || '',
            level: resolveLevelName(schoolClass.levelId),
            modality: resolveModalityName(schoolClass.modalityId),
            subjects: subjectNames.join(', '),
            days_of_week: formatDaysOfWeek(schoolClass.daysOfWeek),
            time: formatClassTime(schoolClass.startTime, schoolClass.endTime),
            nivel: schoolClass.levelId || '',
            subject_id: classSubject.subjectId,
            materia: subject?.name || '',
            teacher_id: classSubject.teacherId || '',
            professor_nome: teacherName,
            alunos_total_na_turma: schoolClass.students.length,
          });
        });
      }
    });

    const headers = [
      'class_id', 'turma', 'codigo', 'programa', 'level', 'modality', 'subjects', 'days_of_week', 'time',
      'nivel', 'subject_id', 'materia', 'teacher_id', 'professor_nome',
      'alunos_total_na_turma'
    ];

    const csv = toCsv(rows, headers);
    const filename = `turmas_detalhado_${formatDateTime()}.csv`;
    
    downloadCsv(filename, csv);
    toast({ title: "Arquivo gerado com filtros aplicados" });
  }, [getFilteredClasses, createMaps, getClassSubjects, getSubject, toast]);

  const exportStudentsByClass = useCallback((filters: ClassFilters) => {
    const classes = getFilteredClasses(filters);
    const { studentsMap } = createMaps();
    
    const rows: any[] = [];
    
    classes.forEach(schoolClass => {
      if (schoolClass.students.length === 0) {
        // Se não há alunos, criar uma linha básica
        rows.push({
          class_id: schoolClass.id,
          turma: schoolClass.name,
          aluno_id: '',
          aluno_nome: '',
          aluno_email: '',
        });
      } else {
        // Uma linha por aluno
        schoolClass.students.forEach(studentId => {
          const student = studentsMap.get(studentId);
          
          rows.push({
            class_id: schoolClass.id,
            turma: schoolClass.name,
            aluno_id: studentId,
            aluno_nome: student?.name || '',
            aluno_email: student?.email || '',
          });
        });
      }
    });

    const headers = ['class_id', 'turma', 'aluno_id', 'aluno_nome', 'aluno_email'];

    const csv = toCsv(rows, headers);
    const filename = `turmas_alunos_${formatDateTime()}.csv`;
    
    downloadCsv(filename, csv);
    toast({ title: "Arquivo gerado com filtros aplicados" });
  }, [getFilteredClasses, createMaps, toast]);

  return {
    exportClassesSummary,
    exportClassesDetailed,
    exportStudentsByClass,
  };
};

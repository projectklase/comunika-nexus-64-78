import { OfferingRef, OfferingKind } from '@/types/offering';
import { useClassStore } from '@/stores/class-store';
import { useClassSubjectStore } from '@/stores/class-subject-store';
import { useSubjectStore } from '@/stores/subject-store';
import { useModalityStore } from '@/stores/modality-store';
import { useProgramStore } from '@/stores/program-store';

export function getOfferingsByClass(classId: string): OfferingRef[] {
  const { getClass } = useClassStore.getState();
  const { getClassSubjects } = useClassSubjectStore.getState();
  const { getSubject } = useSubjectStore.getState();
  const { getModality } = useModalityStore.getState();
  const { getProgram } = useProgramStore.getState();

  const schoolClass = getClass(classId);
  if (!schoolClass || !schoolClass.programId) return [];

  const program = getProgram(schoolClass.programId);
  if (!program) return [];

  if (program.curriculumMode === 'MODALITIES' && schoolClass.modalityId) {
    const modality = getModality(schoolClass.modalityId);
    if (modality) {
      return [{
        kind: 'MODALITY' as OfferingKind,
        id: modality.id,
        label: modality.name,
        programId: program.id,
      }];
    }
  } else {
    // SUBJECTS mode
    const classSubjects = getClassSubjects(classId);
    return classSubjects.map(cs => {
      const subject = getSubject(cs.subjectId);
      return {
        kind: 'SUBJECT' as OfferingKind,
        id: cs.subjectId,
        label: subject?.name || 'Matéria não encontrada',
        programId: program.id,
      };
    }).filter(ref => ref.label !== 'Matéria não encontrada');
  }

  return [];
}

export function getOfferingLabel(ref: OfferingRef): string {
  if (ref.kind === 'SUBJECT') {
    const { getSubject } = useSubjectStore.getState();
    const subject = getSubject(ref.id);
    return subject?.name || ref.label;
  } else {
    const { getModality } = useModalityStore.getState();
    const modality = getModality(ref.id);
    return modality?.name || ref.label;
  }
}

export function getClassOfferingsSummary(classId: string): string {
  const offerings = getOfferingsByClass(classId);
  
  if (offerings.length === 0) return 'Sem ofertas';
  
  if (offerings.length === 1 && offerings[0].kind === 'MODALITY') {
    return offerings[0].label;
  }
  
  return offerings.map(o => o.label).join(', ');
}
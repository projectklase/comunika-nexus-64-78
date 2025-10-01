import { OfferingRef, OfferingKind } from '@/types/offering';

// Note: These helpers are kept simple for now
// They will be refactored in Phase 4 when we consolidate class management

export function getOfferingsByClass(classId: string): OfferingRef[] {
  // TODO: Implement after Phase 4 consolidation
  return [];
}

export function getOfferingLabel(ref: OfferingRef): string {
  return ref.label;
}

export function getClassOfferingsSummary(classId: string): string {
  const offerings = getOfferingsByClass(classId);
  
  if (offerings.length === 0) return 'Sem ofertas';
  
  if (offerings.length === 1 && offerings[0].kind === 'MODALITY') {
    return offerings[0].label;
  }
  
  return offerings.map(o => o.label).join(', ');
}

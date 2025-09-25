// Camada de compatibilidade para abstrair ofertas de turmas
export type OfferingKind = 'SUBJECT' | 'MODALITY';

export interface OfferingRef {
  kind: OfferingKind;
  id: string;
  label: string;
  programId: string;
}
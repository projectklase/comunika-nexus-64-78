// ============================================
// Types: Family Metrics & Relations
// ============================================

export interface FamilyMetrics {
  total_families: number;
  multi_student_families: number;
  avg_students_per_family: number;
  top_guardians: TopGuardian[];
  relationship_distribution: RelationshipDistribution[];
}

export interface TopGuardian {
  name: string;
  email: string | null;
  phone: string | null;
  student_count: number;
  students: string[];
}

export interface RelationshipDistribution {
  relationship_type: string;
  count: number;
}

export type RelationshipType = 
  | 'SIBLING' 
  | 'COUSIN' 
  | 'UNCLE_NEPHEW' 
  | 'GODPARENT_GODCHILD' 
  | 'OTHER'
  | 'NOT_REGISTERED';

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  SIBLING: 'Irmãos',
  COUSIN: 'Primos',
  UNCLE_NEPHEW: 'Tio-Sobrinho',
  GODPARENT_GODCHILD: 'Padrinho-Afilhado',
  OTHER: 'Outro',
  NOT_REGISTERED: 'Não Registrado',
};

export interface FamilyGroup {
  family_key: string;
  guardian_name: string;
  guardian_email: string | null;
  guardian_phone: string | null;
  students: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  student_count: number;
  registered_relationships: number;
}

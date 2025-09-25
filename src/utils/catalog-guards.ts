import { useGlobalLevelStore } from '@/stores/global-level-store';
import { useGlobalModalityStore } from '@/stores/global-modality-store';
import { useGlobalSubjectStore } from '@/stores/global-subject-store';

export interface CatalogRequirements {
  levels: boolean;
  modalities: boolean;
  subjects: boolean;
}

export interface MissingCatalog {
  type: 'level' | 'modality' | 'subject';
  label: string;
  description: string;
}

/**
 * Verifica se os catálogos necessários existem
 */
export function hasCatalogs(requirements: Partial<CatalogRequirements> = {}): boolean {
  const { levels } = useGlobalLevelStore.getState();
  const { modalities } = useGlobalModalityStore.getState();
  const { subjects } = useGlobalSubjectStore.getState();

  const checks: boolean[] = [];

  if (requirements.levels !== false) {
    checks.push(levels.filter(l => l.isActive).length > 0);
  }
  
  if (requirements.modalities !== false) {
    checks.push(modalities.filter(m => m.isActive).length > 0);
  }
  
  if (requirements.subjects !== false) {
    checks.push(subjects.filter(s => s.isActive).length > 0);
  }

  return checks.every(Boolean);
}

/**
 * Retorna lista de catálogos em falta
 */
export function getMissingCatalogs(requirements: Partial<CatalogRequirements> = {}): MissingCatalog[] {
  const { levels } = useGlobalLevelStore.getState();
  const { modalities } = useGlobalModalityStore.getState();
  const { subjects } = useGlobalSubjectStore.getState();

  const missing: MissingCatalog[] = [];

  if (requirements.levels !== false && levels.filter(l => l.isActive).length === 0) {
    missing.push({
      type: 'level',
      label: 'Níveis',
      description: 'Ex: 6º ano, A1, Sub-13'
    });
  }

  if (requirements.modalities !== false && modalities.filter(m => m.isActive).length === 0) {
    missing.push({
      type: 'modality',
      label: 'Modalidades',
      description: 'Ex: Regular, Intensivo, Extensivo'
    });
  }

  if (requirements.subjects !== false && subjects.filter(s => s.isActive).length === 0) {
    missing.push({
      type: 'subject',
      label: 'Matérias',
      description: 'Ex: Matemática, Gramática, Defesa'
    });
  }

  return missing;
}

/**
 * Obtém contador de catálogos ativos
 */
export function getCatalogCounts() {
  const { levels } = useGlobalLevelStore.getState();
  const { modalities } = useGlobalModalityStore.getState();
  const { subjects } = useGlobalSubjectStore.getState();

  return {
    levels: levels.filter(l => l.isActive).length,
    modalities: modalities.filter(m => m.isActive).length,
    subjects: subjects.filter(s => s.isActive).length,
  };
}
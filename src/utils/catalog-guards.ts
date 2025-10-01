import { useLevels } from '@/hooks/useLevels';
import { useModalities } from '@/hooks/useModalities';
import { useSubjects } from '@/hooks/useSubjects';

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

// Note: These functions can't be used outside of React components
// They should be called from within components that have access to hooks
export function useCatalogGuards() {
  const { levels } = useLevels();
  const { modalities } = useModalities();
  const { subjects } = useSubjects();

  /**
   * Verifica se os catálogos necessários existem
   */
  function hasCatalogs(requirements: Partial<CatalogRequirements> = {}): boolean {
    const checks: boolean[] = [];

    if (requirements.levels !== false) {
      checks.push(levels.filter(l => l.is_active).length > 0);
    }
    
    if (requirements.modalities !== false) {
      checks.push(modalities.filter(m => m.is_active).length > 0);
    }
    
    if (requirements.subjects !== false) {
      checks.push(subjects.filter(s => s.is_active).length > 0);
    }

    return checks.every(Boolean);
  }

  /**
   * Retorna lista de catálogos em falta
   */
  function getMissingCatalogs(requirements: Partial<CatalogRequirements> = {}): MissingCatalog[] {
    const missing: MissingCatalog[] = [];

    if (requirements.levels !== false && levels.filter(l => l.is_active).length === 0) {
      missing.push({
        type: 'level',
        label: 'Níveis',
        description: 'Ex: 6º ano, A1, Sub-13'
      });
    }

    if (requirements.modalities !== false && modalities.filter(m => m.is_active).length === 0) {
      missing.push({
        type: 'modality',
        label: 'Modalidades',
        description: 'Ex: Regular, Intensivo, Extensivo'
      });
    }

    if (requirements.subjects !== false && subjects.filter(s => s.is_active).length === 0) {
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
  function getCatalogCounts() {
    return {
      levels: levels.filter(l => l.is_active).length,
      modalities: modalities.filter(m => m.is_active).length,
      subjects: subjects.filter(s => s.is_active).length,
    };
  }

  return {
    hasCatalogs,
    getMissingCatalogs,
    getCatalogCounts,
  };
}

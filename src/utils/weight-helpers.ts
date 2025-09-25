import { isWeightsEnabled } from '@/stores/school-settings-store';

/**
 * Utilitários para trabalhar com pesos baseado nas configurações da escola
 */

/**
 * Filtra campos relacionados a peso baseado na configuração da escola
 */
export function filterWeightFields<T extends Record<string, any>>(data: T): T {
  if (isWeightsEnabled()) {
    return data;
  }

  // Se pesos estão desabilitados, remover campos relacionados
  const filtered = { ...data };
  delete filtered.peso;
  delete filtered.weight;
  delete filtered.defaultWeights;
  
  return filtered;
}

/**
 * Valida se um peso é necessário baseado na configuração da escola
 */
export function isWeightRequired(): boolean {
  return isWeightsEnabled();
}

/**
 * Retorna um peso padrão seguro baseado na configuração da escola
 */
export function getSafeDefaultWeight(defaultValue: number = 1): number | null {
  return isWeightsEnabled() ? defaultValue : null;
}

/**
 * Formata exibição de peso para UI
 */
export function formatWeightDisplay(weight: number | null, usePeso?: boolean): string {
  if (!isWeightsEnabled() || weight === null || usePeso === false) {
    return '';
  }
  
  return `Peso: ${weight}`;
}

/**
 * Valida se dados de atividade estão consistentes com configuração de peso
 */
export function validateActivityWeight(activityData: any): { isValid: boolean; message?: string } {
  const weightsEnabled = isWeightsEnabled();
  
  // Se pesos estão desabilitados na escola, não deve haver campo peso
  if (!weightsEnabled && activityData.peso !== undefined && activityData.peso !== null) {
    return {
      isValid: false,
      message: 'Pesos estão desabilitados para esta escola'
    };
  }
  
  // Se usePeso está false, peso deve ser null/undefined
  if (activityData.usePeso === false && activityData.peso !== undefined && activityData.peso !== null) {
    return {
      isValid: false,
      message: 'Peso desabilitado para esta atividade'
    };
  }
  
  // Se pesos estão habilitados, usePeso é true e há valor, validar se está na faixa 0-10
  if (weightsEnabled && activityData.usePeso !== false && activityData.peso !== undefined && activityData.peso !== null) {
    if (activityData.peso < 0 || activityData.peso > 10) {
      return {
        isValid: false,
        message: 'Peso deve estar entre 0 e 10'
      };
    }
  }
  
  return { isValid: true };
}
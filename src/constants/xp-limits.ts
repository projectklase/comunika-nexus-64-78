/**
 * Limites de XP por tipo de desafio para balanceamento econômico
 * Previne inflação de XP e mantém o jogo de cartas equilibrado
 */

export const XP_LIMITS_BY_TYPE: Record<string, number> = {
  DAILY: 50,
  WEEKLY: 200,
  ACHIEVEMENT: 500,
} as const;

export const XP_SUGGESTIONS_BY_TYPE: Record<string, { min: number; max: number; label: string }> = {
  DAILY: { min: 10, max: 30, label: 'Recomendado: 10-30 XP para desafios diários' },
  WEEKLY: { min: 50, max: 150, label: 'Recomendado: 50-150 XP para desafios semanais' },
  ACHIEVEMENT: { min: 100, max: 300, label: 'Recomendado: 100-300 XP para conquistas' },
} as const;

// Referência de economia para tooltips
export const XP_ECONOMY_HINTS = [
  '💡 100 XP = 1 Pacote Básico',
  '💡 500 XP = 1 Pacote Raro',
  '💡 1500 XP = 1 Pacote Épico',
] as const;

/**
 * Retorna o limite máximo de XP para um tipo de desafio
 */
export function getXPLimit(type: string): number {
  return XP_LIMITS_BY_TYPE[type] || 500;
}

/**
 * Retorna sugestão de XP para um tipo de desafio
 */
export function getXPSuggestion(type: string): { min: number; max: number; label: string } | null {
  return XP_SUGGESTIONS_BY_TYPE[type] || null;
}

/**
 * Valida se o valor de XP está dentro do limite
 */
export function isXPWithinLimit(type: string, xp: number): boolean {
  const limit = getXPLimit(type);
  return xp <= limit;
}

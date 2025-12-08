import { CardRarity } from '@/types/cards';

/**
 * XP ganho ao reciclar uma carta de cada raridade
 * Baseado em ~15-20% do custo de aquisição via pacotes
 */
export const RECYCLE_XP_VALUES: Record<CardRarity, number> = {
  COMMON: 5,      // ~15% do custo básico (100 XP / 3 cartas ≈ 33 XP/carta)
  RARE: 15,       // ~15% do custo raro
  EPIC: 50,       // ~17% do custo épico
  LEGENDARY: 150, // ~21% do custo lendário
  SPECIAL: 200,   // Cartas especiais valem mais
  LIMITED_EDITION: 3500, // Cartas de evento: ~44% do custo (8000 XP)
};

/**
 * Bônus de lote para incentivar reciclagem em massa
 */
export const RECYCLE_BATCH_BONUS = {
  SMALL: { min: 5, max: 9, bonus: 0.25 },   // +25% para 5-9 cartas
  LARGE: { min: 10, bonus: 0.50 },           // +50% para 10+ cartas
} as const;

/**
 * Calcula o multiplicador de bônus baseado na quantidade de cartas
 */
export function getBatchBonusMultiplier(totalCards: number): number {
  if (totalCards >= RECYCLE_BATCH_BONUS.LARGE.min) {
    return 1 + RECYCLE_BATCH_BONUS.LARGE.bonus;
  }
  if (totalCards >= RECYCLE_BATCH_BONUS.SMALL.min) {
    return 1 + RECYCLE_BATCH_BONUS.SMALL.bonus;
  }
  return 1.0;
}

/**
 * Retorna o label do bônus para exibição
 */
export function getBatchBonusLabel(totalCards: number): string | null {
  if (totalCards >= RECYCLE_BATCH_BONUS.LARGE.min) {
    return `+${RECYCLE_BATCH_BONUS.LARGE.bonus * 100}% Bônus de Lote`;
  }
  if (totalCards >= RECYCLE_BATCH_BONUS.SMALL.min) {
    return `+${RECYCLE_BATCH_BONUS.SMALL.bonus * 100}% Bônus de Lote`;
  }
  return null;
}

/**
 * Labels de raridade para exibição
 */
export const RARITY_RECYCLE_LABELS: Record<CardRarity, string> = {
  COMMON: 'Comum',
  RARE: 'Rara',
  EPIC: 'Épica',
  LEGENDARY: 'Lendária',
  SPECIAL: 'Especial',
  LIMITED_EDITION: 'Edição Limitada',
};

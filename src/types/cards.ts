export type CardRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type CardCategory = 'MATEMATICA' | 'CIENCIAS' | 'HISTORIA' | 'ARTES' | 'ESPORTES' | 'ESPECIAL';
export type CardEffectType = 'BURN' | 'SHIELD' | 'BOOST' | 'HEAL' | 'FREEZE' | 'DOUBLE' | 'REFLECT';
export type CardType = 'MONSTER' | 'TRAP' | 'SPELL';
export type PackType = 'BASIC' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'FREE';
export type UnlockSource = 'PACK' | 'REWARD' | 'EVENT' | 'TRADE';

export interface CardEffect {
  type: CardEffectType;
  value: number;
  description: string;
}

export interface Card {
  id: string;
  name: string;
  description?: string;
  category: CardCategory;
  rarity: CardRarity;
  card_type?: CardType;
  atk: number;
  def: number;
  effects: CardEffect[];
  image_url?: string;
  image_prompt?: string;
  required_level: number;
  school_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCard {
  id: string;
  user_id: string;
  card_id: string;
  quantity: number;
  unlocked_at: string;
  unlock_source: UnlockSource;
  card?: Card;
}

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  card_ids: string[];
  is_active: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardPack {
  id: string;
  user_id: string;
  pack_type: PackType;
  cards_received: string[];
  xp_cost: number;
  opened_at: string;
}

export interface OpenPackResult {
  success: boolean;
  pack_type: PackType;
  xp_spent: number;
  cards_received: Card[];
}

export const PACK_COSTS: Record<PackType, number> = {
  BASIC: 100,
  RARE: 500,
  EPIC: 1500,
  LEGENDARY: 5000,
  FREE: 0,
};

export const PACK_SIZES: Record<PackType, number> = {
  BASIC: 3,
  RARE: 5,
  EPIC: 5,
  LEGENDARY: 7,
  FREE: 5,
};

export const RARITY_COLORS: Record<CardRarity, string> = {
  COMMON: 'text-gray-400 border-gray-500',
  RARE: 'text-blue-400 border-blue-500',
  EPIC: 'text-purple-400 border-purple-500',
  LEGENDARY: 'text-yellow-400 border-yellow-500',
};

export const RARITY_LABELS: Record<CardRarity, string> = {
  COMMON: 'Comum',
  RARE: 'Rara',
  EPIC: 'Épica',
  LEGENDARY: 'Lendária',
};

export const CATEGORY_LABELS: Record<CardCategory, string> = {
  MATEMATICA: 'Matemática',
  CIENCIAS: 'Ciências',
  HISTORIA: 'História',
  ARTES: 'Artes',
  ESPORTES: 'Esportes',
  ESPECIAL: 'Especial',
};

export const CATEGORY_ICONS: Record<CardCategory, string> = {
  MATEMATICA: 'Calculator',
  CIENCIAS: 'FlaskConical',
  HISTORIA: 'Scroll',
  ARTES: 'Palette',
  ESPORTES: 'Dumbbell',
  ESPECIAL: 'Sparkles',
};

export const CATEGORY_COLORS: Record<CardCategory, string> = {
  MATEMATICA: 'from-blue-600 to-blue-900',
  CIENCIAS: 'from-emerald-600 to-emerald-900',
  HISTORIA: 'from-amber-600 to-amber-900',
  ARTES: 'from-pink-600 to-pink-900',
  ESPORTES: 'from-orange-600 to-orange-900',
  ESPECIAL: 'from-yellow-400 to-yellow-700',
};

export const RARITY_FRAME_COLORS: Record<CardRarity, {
  outer: string;
  inner: string;
  glow: string;
}> = {
  COMMON: {
    outer: 'from-gray-400 to-gray-600',
    inner: 'border-gray-500',
    glow: '',
  },
  RARE: {
    outer: 'from-blue-400 to-blue-700',
    inner: 'border-blue-500',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]',
  },
  EPIC: {
    outer: 'from-purple-400 via-purple-600 to-purple-900',
    inner: 'border-purple-500',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
  },
  LEGENDARY: {
    outer: 'from-yellow-300 via-yellow-500 to-amber-600',
    inner: 'border-yellow-400',
    glow: 'shadow-[0_0_30px_rgba(234,179,8,0.6)] animate-legendary-glow',
  },
};

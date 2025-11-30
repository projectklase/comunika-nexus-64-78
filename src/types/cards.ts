export type CardRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type CardCategory = 'MATEMATICA' | 'CIENCIAS' | 'HISTORIA' | 'ARTES' | 'ESPORTES' | 'ESPECIAL';
export type CardEffectType = 'BURN' | 'SHIELD' | 'BOOST' | 'HEAL' | 'FREEZE' | 'DOUBLE';
export type PackType = 'BASIC' | 'RARE' | 'EPIC' | 'LEGENDARY';
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
};

export const PACK_SIZES: Record<PackType, number> = {
  BASIC: 3,
  RARE: 5,
  EPIC: 5,
  LEGENDARY: 7,
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

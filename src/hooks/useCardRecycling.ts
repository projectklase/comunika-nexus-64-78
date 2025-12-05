import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardRarity, UserCard } from '@/types/cards';
import { 
  RECYCLE_XP_VALUES, 
  getBatchBonusMultiplier, 
  getBatchBonusLabel 
} from '@/constants/card-recycling';

export interface RecycleSelection {
  cardId: string;
  quantity: number;
  card: Card;
}

export interface RecyclePreview {
  totalCards: number;
  baseXP: number;
  bonusMultiplier: number;
  bonusLabel: string | null;
  totalXP: number;
  breakdown: {
    rarity: CardRarity;
    count: number;
    xpPerCard: number;
    subtotal: number;
  }[];
}

export interface RecycleResult {
  success: boolean;
  cards_recycled: number;
  base_xp: number;
  bonus_multiplier: number;
  total_xp: number;
}

/**
 * Calcula o preview de XP antes de reciclar
 */
export function calculateRecyclePreview(selections: RecycleSelection[]): RecyclePreview {
  const totalCards = selections.reduce((sum, s) => sum + s.quantity, 0);
  const bonusMultiplier = getBatchBonusMultiplier(totalCards);
  const bonusLabel = getBatchBonusLabel(totalCards);

  // Agrupar por raridade para breakdown
  const byRarity = new Map<CardRarity, { count: number; xpPerCard: number }>();
  
  for (const selection of selections) {
    const rarity = selection.card.rarity;
    const xpPerCard = RECYCLE_XP_VALUES[rarity];
    const existing = byRarity.get(rarity);
    
    if (existing) {
      existing.count += selection.quantity;
    } else {
      byRarity.set(rarity, { count: selection.quantity, xpPerCard });
    }
  }

  const breakdown = Array.from(byRarity.entries()).map(([rarity, data]) => ({
    rarity,
    count: data.count,
    xpPerCard: data.xpPerCard,
    subtotal: data.count * data.xpPerCard,
  }));

  const baseXP = breakdown.reduce((sum, b) => sum + b.subtotal, 0);
  const totalXP = Math.floor(baseXP * bonusMultiplier);

  return {
    totalCards,
    baseXP,
    bonusMultiplier,
    bonusLabel,
    totalXP,
    breakdown,
  };
}

/**
 * Filtra cartas que podem ser recicladas (duplicatas com quantity > 1)
 */
export function getRecyclableCards(userCards: UserCard[]): UserCard[] {
  return userCards.filter(uc => uc.quantity > 1 && uc.card);
}

/**
 * Hook para gerenciar reciclagem de cartas
 */
export function useCardRecycling() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const recycleCards = useMutation({
    mutationFn: async (selections: RecycleSelection[]) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (selections.length === 0) throw new Error('Nenhuma carta selecionada');

      const cardsPayload = selections.map(s => ({
        card_id: s.cardId,
        quantity: s.quantity,
      }));

      const { data, error } = await supabase.rpc('recycle_cards', {
        p_user_id: user.id,
        p_cards: cardsPayload,
      });

      if (error) throw error;
      return data as unknown as RecycleResult;
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['user-cards'] });
      queryClient.invalidateQueries({ queryKey: ['all-cards'] });
      
      // Atualizar XP do usuário
      refetchUser();

      toast({
        title: '🔥 Cartas Recicladas!',
        description: `${result.cards_recycled} carta(s) reciclada(s) por ${result.total_xp} XP`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reciclar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    recycleCards: recycleCards.mutate,
    recycleCardsAsync: recycleCards.mutateAsync,
    isRecycling: recycleCards.isPending,
    calculateRecyclePreview,
    getRecyclableCards,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  Card, 
  UserCard, 
  Deck, 
  CardPack, 
  OpenPackResult, 
  PackType,
  CardRarity,
  PACK_COSTS 
} from '@/types/cards';

export const useCards = () => {
  const { user, refetchUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch todas as cartas disponíveis
  const { data: allCards = [], isLoading: loadingCards } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('is_active', true)
        .order('rarity', { ascending: false })
        .order('name');

      if (error) throw error;
      return data.map(card => ({
        ...card,
        effects: (card.effects as any) || [],
      })) as Card[];
    },
  });

  // Fetch coleção do usuário com detalhes das cartas
  const { data: userCards = [], isLoading: loadingUserCards } = useQuery({
    queryKey: ['user-cards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_cards')
        .select(`
          *,
          card:cards(*)
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      return data.map(uc => ({
        ...uc,
        card: uc.card ? {
          ...uc.card,
          effects: (uc.card.effects as any) || [],
        } : undefined,
      })) as UserCard[];
    },
    enabled: !!user?.id,
  });

  // Fetch decks do usuário
  const { data: decks = [], isLoading: loadingDecks } = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true) // Filtrar apenas decks ativos (soft delete)
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Deck[];
    },
    enabled: !!user?.id,
  });

  // Fetch histórico de pacotes
  const { data: packHistory = [], isLoading: loadingPacks } = useQuery({
    queryKey: ['card-packs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('card_packs')
        .select('*')
        .eq('user_id', user.id)
        .order('opened_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CardPack[];
    },
    enabled: !!user?.id,
  });

  // Verificar se já reivindicou pacote grátis
  const hasClaimedFreePack = packHistory.some(p => p.pack_type === 'FREE');

  // Reivindicar pacote grátis inicial
  const claimFreePack = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.rpc('claim_free_starter_pack', {
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = data as any;
      return {
        success: result.success,
        pack_type: result.pack_type,
        xp_spent: result.xp_spent,
        cards_received: result.cards_received?.map((card: any) => ({
          ...card,
          effects: card.effects || [],
        })) || [],
      } as OpenPackResult;
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['user-cards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['card-packs', user?.id] });
      
      // Sincronizar XP do usuário após abrir pacote
      if (refetchUser) {
        await refetchUser();
      }
      
      const cardCount = result.cards_received?.length || 0;
      toast.success(`🎁 Pacote inicial gratuito reivindicado! ${cardCount} cartas recebidas!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao reivindicar pacote');
    },
  });

  // Abrir pacote de cartas
  const openPack = useMutation({
    mutationFn: async (packType: PackType) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.rpc('open_card_pack', {
        p_user_id: user.id,
        p_pack_type: packType,
      });

      if (error) throw error;
      
      // Parse JSONB response from RPC
      const result = data as any;
      return {
        success: result.success,
        pack_type: result.pack_type,
        xp_spent: result.xp_spent,
        cards_received: result.cards_received?.map((card: any) => ({
          ...card,
          effects: card.effects || [],
        })) || [],
      } as OpenPackResult;
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['user-cards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['card-packs', user?.id] });
      
      // Sincronizar XP do usuário após abrir pacote
      if (refetchUser) {
        await refetchUser();
      }
      
      const cardCount = result.cards_received?.length || 0;
      toast.success(`🎴 Pacote ${result.pack_type} aberto! ${cardCount} cartas recebidas!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao abrir pacote');
    },
  });

  // Criar deck
  const createDeck = useMutation({
    mutationFn: async (data: { name: string; description?: string; card_ids: string[] }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Validações para Duelo Direto
      if (data.card_ids.length < 5) {
        throw new Error('Deck deve ter no mínimo 5 cartas');
      }
      if (data.card_ids.length > 15) {
        throw new Error('Deck deve ter no máximo 15 cartas');
      }

      // Verificar máximo 2 cópias da mesma carta
      const cardCounts = data.card_ids.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const hasInvalidCount = Object.values(cardCounts).some(count => count > 2);
      if (hasInvalidCount) {
        throw new Error('Máximo 2 cópias da mesma carta por deck');
      }

      const { error } = await supabase.from('decks').insert({
        user_id: user.id,
        name: data.name,
        description: data.description,
        card_ids: data.card_ids,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks', user?.id] });
      toast.success('✨ Deck criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar deck');
    },
  });

  // Atualizar deck
  const updateDeck = useMutation({
    mutationFn: async (data: { 
      id: string; 
      name?: string; 
      description?: string;
      card_ids?: string[];
      is_favorite?: boolean;
    }) => {
      // Validações para Duelo Direto se card_ids for atualizado
      if (data.card_ids) {
        if (data.card_ids.length < 5) {
          throw new Error('Deck deve ter no mínimo 5 cartas');
        }
        if (data.card_ids.length > 15) {
          throw new Error('Deck deve ter no máximo 15 cartas');
        }

        const cardCounts = data.card_ids.reduce((acc, id) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const hasInvalidCount = Object.values(cardCounts).some(count => count > 2);
        if (hasInvalidCount) {
          throw new Error('Máximo 2 cópias da mesma carta por deck');
        }
      }

      const { error } = await supabase
        .from('decks')
        .update({ 
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks', user?.id] });
      toast.success('✅ Deck atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar deck');
    },
  });

  // Deletar deck permanentemente
  const deleteDeck = useMutation({
    mutationFn: async (deckId: string) => {
      // Exclusão permanente - FK com SET NULL preserva histórico de batalhas
      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks', user?.id] });
      toast.success('🗑️ Deck excluído');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir deck');
    },
  });

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  const getCardById = (cardId: string): Card | undefined => {
    return allCards.find(c => c.id === cardId);
  };
  
  const getUserCardQuantity = (cardId: string): number => {
    const userCard = userCards.find(uc => uc.card_id === cardId);
    return userCard?.quantity || 0;
  };

  const getTotalCards = (): number => {
    return userCards.reduce((sum, uc) => sum + uc.quantity, 0);
  };
  
  const getUniqueCards = (): number => {
    return userCards.length;
  };

  const getCardsByRarity = (rarity: CardRarity): UserCard[] => {
    return userCards.filter(uc => uc.card?.rarity === rarity);
  };

  const canOpenPack = (packType: PackType): boolean => {
    if (packType === 'FREE') return !hasClaimedFreePack;
    
    const costs: Record<PackType, number> = {
      BASIC: 100,
      RARE: 500,
      EPIC: 1500,
      LEGENDARY: 5000,
      FREE: 0,
    };
    const userXp = (user as any)?.total_xp || 0;
    return userXp >= costs[packType];
  };

  const getPackCost = (packType: PackType): number => {
    const costs: Record<PackType, number> = {
      BASIC: 100,
      RARE: 500,
      EPIC: 1500,
      LEGENDARY: 5000,
      FREE: 0,
    };
    return costs[packType];
  };

  const hasCard = (cardId: string): boolean => {
    return userCards.some(uc => uc.card_id === cardId);
  };

  const getCollectionProgress = (): { owned: number; total: number; percentage: number } => {
    const total = allCards.length;
    const owned = getUniqueCards();
    const percentage = total > 0 ? Math.round((owned / total) * 100) : 0;
    return { owned, total, percentage };
  };

  return {
    // Data
    allCards,
    userCards,
    decks,
    packHistory,
    hasClaimedFreePack,
    
    // Loading states
    isLoading: loadingCards || loadingUserCards || loadingDecks || loadingPacks,
    loadingCards,
    loadingUserCards,
    loadingDecks,
    
    // Mutations
    claimFreePack: claimFreePack.mutate,
    isClaimingFreePack: claimFreePack.isPending,
    openPack: openPack.mutate,
    isOpeningPack: openPack.isPending,
    createDeck: createDeck.mutate,
    isCreatingDeck: createDeck.isPending,
    updateDeck: updateDeck.mutate,
    isUpdatingDeck: updateDeck.isPending,
    deleteDeck: deleteDeck.mutate,
    isDeletingDeck: deleteDeck.isPending,
    
    // Helpers
    getCardById,
    getUserCardQuantity,
    getTotalCards,
    getUniqueCards,
    getCardsByRarity,
    canOpenPack,
    getPackCost,
    hasCard,
    getCollectionProgress,
  };
};

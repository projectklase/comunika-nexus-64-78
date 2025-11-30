import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Battle {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_deck_id: string;
  player2_deck_id: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';
  current_turn?: 'PLAYER1' | 'PLAYER2';
  current_round: number;
  rounds_data: RoundData[];
  player1_rounds_won: number;
  player2_rounds_won: number;
  winner_id?: string;
  started_at?: string;
  finished_at?: string;
  last_action_at: string;
  created_at: string;
}

export interface RoundData {
  round: number;
  player1_cards: {
    line1: CardInPlay[];
    line2: CardInPlay[];
    line3: CardInPlay[];
  };
  player2_cards: {
    line1: CardInPlay[];
    line2: CardInPlay[];
    line3: CardInPlay[];
  };
  player1_score: number;
  player2_score: number;
}

export interface CardInPlay {
  id: string;
  name: string;
  atk: number;
  def: number;
}

export const useBattle = (battleId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch batalha específica
  const { data: battle, isLoading } = useQuery({
    queryKey: ['battle', battleId],
    queryFn: async () => {
      if (!battleId) return null;

      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .single();

      if (error) throw error;
      return {
        ...data,
        rounds_data: (data.rounds_data as any) || [],
      } as Battle;
    },
    enabled: !!battleId,
    refetchInterval: 2000, // Polling a cada 2 segundos
  });

  // Fetch batalhas do usuário
  const { data: userBattles = [], isLoading: loadingUserBattles } = useQuery({
    queryKey: ['user-battles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data.map(d => ({
        ...d,
        rounds_data: (d.rounds_data as any) || [],
      })) as Battle[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription para batalha ativa
  useEffect(() => {
    if (!battleId) return;

    const channel = supabase
      .channel(`battle:${battleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${battleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['battle', battleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, queryClient]);

  // Criar batalha
  const createBattle = useMutation({
    mutationFn: async (data: {
      player2_id: string;
      player1_deck_id: string;
      player2_deck_id: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data: newBattle, error } = await supabase
        .from('battles')
        .insert({
          player1_id: user.id,
          player2_id: data.player2_id,
          player1_deck_id: data.player1_deck_id,
          player2_deck_id: data.player2_deck_id,
          status: 'WAITING',
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...newBattle,
        rounds_data: (newBattle.rounds_data as any) || [],
      } as Battle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-battles'] });
      toast.success('Batalha criada! Aguardando oponente...');
    },
  });

  // Iniciar batalha
  const startBattle = useMutation({
    mutationFn: async (battleId: string) => {
      const { error } = await supabase
        .from('battles')
        .update({
          status: 'IN_PROGRESS',
          current_turn: 'PLAYER1',
          started_at: new Date().toISOString(),
        })
        .eq('id', battleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battle'] });
      toast.success('Batalha iniciada!');
    },
  });

  // Jogar carta
  const playCard = useMutation({
    mutationFn: async (data: { battleId: string; line: number; cardId: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase.rpc('play_battle_turn', {
        p_battle_id: data.battleId,
        p_player_id: user.id,
        p_line: data.line,
        p_card_id: data.cardId,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battle'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao jogar carta');
    },
  });

  // Finalizar round
  const finishRound = useMutation({
    mutationFn: async (battleId: string) => {
      const { data: result, error } = await supabase.rpc('finish_battle_round', {
        p_battle_id: battleId,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['battle'] });
      
      if (result?.battle_finished) {
        toast.success(`Batalha finalizada! Vencedor: ${result.winner}`);
      } else {
        toast.info(`Round ${result?.next_round} começando...`);
      }
    },
  });

  // Helpers
  const isMyTurn = () => {
    if (!battle || !user?.id) return false;
    
    if (battle.player1_id === user.id) {
      return battle.current_turn === 'PLAYER1';
    }
    return battle.current_turn === 'PLAYER2';
  };

  const getMyPlayerNumber = (): 'PLAYER1' | 'PLAYER2' | null => {
    if (!battle || !user?.id) return null;
    return battle.player1_id === user.id ? 'PLAYER1' : 'PLAYER2';
  };

  const getCurrentRound = (): RoundData | null => {
    if (!battle || !battle.rounds_data) return null;
    return battle.rounds_data[battle.current_round - 1] || null;
  };

  return {
    // Data
    battle,
    userBattles,
    currentRound: getCurrentRound(),

    // Loading
    isLoading: isLoading || loadingUserBattles,

    // Mutations
    createBattle: createBattle.mutate,
    startBattle: startBattle.mutate,
    playCard: playCard.mutate,
    finishRound: finishRound.mutate,
    
    isCreating: createBattle.isPending,
    isPlaying: playCard.isPending,

    // Helpers
    isMyTurn: isMyTurn(),
    myPlayerNumber: getMyPlayerNumber(),
  };
};

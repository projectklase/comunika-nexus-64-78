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
  game_state: any; // JSONB with HP, fields, hands, etc.
  winner_id?: string;
  started_at?: string;
  finished_at?: string;
  last_action_at: string;
  created_at: string;
  turn_started_at?: string;
}

export interface CardInPlay {
  id: string;
  name: string;
  atk: number;
  def: number;
  image_url?: string;
  rarity?: string;
  effects?: any[];
}

export const useBattle = (battleId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch specific battle
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
      return data as Battle;
    },
    enabled: !!battleId,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Fetch user's battles
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
      return data as Battle[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription for active battle
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

  // Create battle
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
      return newBattle as Battle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-battles'] });
      toast.success('Batalha criada! Aguardando oponente...');
    },
  });

  // Start battle
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

  // Play card
  const playCard = useMutation({
    mutationFn: async (data: { battleId: string; cardId: string; isTrap?: boolean }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase.rpc('play_card', {
        p_battle_id: data.battleId,
        p_player_id: user.id,
        p_card_id: data.cardId,
        p_position: data.isTrap ? 'TRAP' : 'MONSTER',
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battle'] });
      toast.success('Carta jogada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao jogar carta');
    },
  });

  // Attack
  const attack = useMutation({
    mutationFn: async (battleId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase.rpc('attack', {
        p_battle_id: battleId,
        p_player_id: user.id,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['battle'] });
      
      if (result?.battle_finished) {
        toast.success('Batalha finalizada!');
      } else {
        toast.info('Ataque realizado!');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atacar');
    },
  });

  // Abandon battle
  const abandonBattle = useMutation({
    mutationFn: async (battleId: string) => {
      const { error } = await supabase
        .from('battles')
        .update({ 
          status: 'ABANDONED',
          finished_at: new Date().toISOString()
        })
        .eq('id', battleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battle'] });
      queryClient.invalidateQueries({ queryKey: ['user-battles'] });
      toast.info('Batalha abandonada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao abandonar batalha');
    },
  });

  // Force turn timeout
  const forceTimeoutTurn = useMutation({
    mutationFn: async (battleId: string) => {
      const { error } = await supabase.rpc('check_turn_timeout', {
        p_battle_id: battleId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battle'] });
      toast.info('Tempo esgotado! Turno passou automaticamente.');
    },
  });

  // Helpers
  const isMyTurnFn = () => {
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

  return {
    // Data
    battle,
    userBattles,

    // Loading
    isLoading: isLoading || loadingUserBattles,

    // Mutations
    createBattle: createBattle.mutate,
    startBattle: startBattle.mutate,
    playCard,
    attack,
    abandonBattle,
    forceTimeoutTurn: forceTimeoutTurn.mutate,
    
    isCreating: createBattle.isPending,
    isPlaying: playCard.isPending,

    // Helpers
    isMyTurn: isMyTurnFn,
    myPlayerNumber: getMyPlayerNumber,
  };
};

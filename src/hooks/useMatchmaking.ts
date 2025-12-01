import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type MatchmakingStatus = 'idle' | 'searching' | 'found' | 'error';

interface MatchmakingResult {
  status: MatchmakingStatus;
  queuePosition: number | null;
  searchTime: number;
  foundBattleId: string | null;
  playersInQueue: number;
  joinQueue: (deckId: string) => Promise<void>;
  leaveQueue: () => Promise<void>;
  resetMatchmaking: () => Promise<void>;
}

export function useMatchmaking(): MatchmakingResult {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [foundBattleId, setFoundBattleId] = useState<string | null>(null);
  const [playersInQueue, setPlayersInQueue] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Timer for search duration
  useEffect(() => {
    if (status === 'searching') {
      timerRef.current = setInterval(() => {
        setSearchTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setSearchTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status]);

  // Realtime subscription for queue updates
  useEffect(() => {
    if (!user || status !== 'searching') return;

    const channel = supabase
      .channel('battle-queue-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battle_queue',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord.status === 'MATCHED' && newRecord.battle_id) {
            // Invalidate battle cache before setting new battle ID
            queryClient.invalidateQueries({ queryKey: ['battle'] });
            setFoundBattleId(newRecord.battle_id);
            setStatus('found');
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, status]);

  // Poll queue position, players count, AND match status (fallback)
  useEffect(() => {
    if (status !== 'searching' || !user || !currentSchool) return;

    const pollPosition = async () => {
      try {
        // Check if we've been matched (fallback for realtime subscription)
        const { data: queueData } = await supabase
          .from('battle_queue')
          .select('status, battle_id')
          .eq('user_id', user.id)
          .single();

        if (queueData?.status === 'MATCHED' && queueData.battle_id) {
          // Validate that the battle is actually IN_PROGRESS
          const { data: battleData } = await supabase
            .from('battles')
            .select('status')
            .eq('id', queueData.battle_id)
            .single();

          if (battleData?.status === 'IN_PROGRESS') {
            // Battle is active, proceed
            queryClient.invalidateQueries({ queryKey: ['battle'] });
            setFoundBattleId(queueData.battle_id);
            setStatus('found');
            toast.success('Oponente encontrado!');
          } else {
            // Old/finished battle - clean up and keep searching
            await supabase
              .from('battle_queue')
              .delete()
              .eq('user_id', user.id);
          }
          return;
        }

        // Get queue position
        const { data: positionData } = await supabase.rpc('get_queue_position', {
          p_user_id: user.id,
          p_school_id: currentSchool.id,
        });

        if (positionData !== null) {
          setQueuePosition(positionData);
        }

        // Count players in queue for this school
        const { count } = await supabase
          .from('battle_queue')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id)
          .eq('status', 'SEARCHING');

        setPlayersInQueue(count || 0);
      } catch (error) {
        console.error('Error polling queue:', error);
      }
    };

    pollPosition();
    const interval = setInterval(pollPosition, 2000);

    return () => clearInterval(interval);
  }, [status, user, currentSchool]);

  const joinQueue = useCallback(
    async (deckId: string) => {
      if (!user || !currentSchool) {
        toast.error('Erro ao entrar na fila');
        return;
      }

      try {
        setStatus('searching');
        setSearchTime(0);

        // Clean up old queue entries before joining
        await supabase
          .from('battle_queue')
          .delete()
          .eq('user_id', user.id);

        const { data, error } = await supabase.rpc('join_battle_queue', {
          p_user_id: user.id,
          p_deck_id: deckId,
          p_school_id: currentSchool.id,
        });

        if (error) throw error;

        const result = data as { status: string; battle_id?: string; queue_id?: string };

        if (result.status === 'MATCHED' && result.battle_id) {
          // Immediate match found! Invalidate cache first
          queryClient.invalidateQueries({ queryKey: ['battle'] });
          setFoundBattleId(result.battle_id);
          setStatus('found');
          toast.success('Oponente encontrado!');
        } else {
          // Added to queue, waiting for opponent
          toast.success('Procurando oponente...');
        }
      } catch (error) {
        console.error('Error joining queue:', error);
        setStatus('error');
        toast.error('Erro ao entrar na fila de batalha');
      }
    },
    [user, currentSchool, queryClient]
  );

  const leaveQueue = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.rpc('leave_battle_queue', {
        p_user_id: user.id,
      });

      setStatus('idle');
      setQueuePosition(null);
      setFoundBattleId(null);
      setPlayersInQueue(0);
      toast.info('Busca cancelada');
    } catch (error) {
      console.error('Error leaving queue:', error);
      toast.error('Erro ao sair da fila');
    }
  }, [user]);

  const resetMatchmaking = useCallback(async () => {
    if (!user) return;

    try {
      // Clean queue entry
      await supabase
        .from('battle_queue')
        .delete()
        .eq('user_id', user.id);

      // Reset local state
      setStatus('idle');
      setQueuePosition(null);
      setFoundBattleId(null);
      setPlayersInQueue(0);
    } catch (error) {
      console.error('Error resetting matchmaking:', error);
    }
  }, [user]);

  return {
    status,
    queuePosition,
    searchTime,
    foundBattleId,
    playersInQueue,
    joinQueue,
    leaveQueue,
    resetMatchmaking,
  };
}

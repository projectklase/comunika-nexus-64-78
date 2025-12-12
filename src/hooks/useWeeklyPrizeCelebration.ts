import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';

interface Winner {
  user_id: string;
  name: string;
  avatar: string | null;
  equipped_avatar: {
    emoji?: string;
    imageUrl?: string;
  } | null;
  total_xp: number;
  position: number;
  prize_xp: number;
}

interface WeeklyPrizeResults {
  already_viewed?: boolean;
  no_data?: boolean;
  week_start?: string;
  winners?: Winner[];
  my_position?: number;
  my_prize?: number;
}

export function useWeeklyPrizeCelebration() {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const [showModal, setShowModal] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [myPosition, setMyPosition] = useState<number>(0);
  const [myPrize, setMyPrize] = useState<number>(0);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkWeeklyPrizes() {
      if (!user?.id || !currentSchool?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_last_weekly_prize_results', {
          p_school_id: currentSchool.id,
          p_user_id: user.id
        });

        if (error) {
          console.error('Error fetching weekly prize results:', error);
          setIsLoading(false);
          return;
        }

        const results = data as WeeklyPrizeResults;

        // Se já viu ou não há dados, não mostra modal
        if (results?.already_viewed || results?.no_data || !results?.winners) {
          setShowModal(false);
          setIsLoading(false);
          return;
        }

        // Temos resultados para mostrar!
        setWinners(results.winners);
        setMyPosition(results.my_position || 0);
        setMyPrize(results.my_prize || 0);
        setWeekStart(results.week_start || null);
        setShowModal(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Error in checkWeeklyPrizes:', err);
        setIsLoading(false);
      }
    }

    checkWeeklyPrizes();
  }, [user?.id, currentSchool?.id]);

  const markAsSeen = async () => {
    if (!weekStart || !currentSchool?.id) {
      setShowModal(false);
      return;
    }

    try {
      await supabase.rpc('mark_weekly_prize_viewed', {
        p_school_id: currentSchool.id,
        p_week_start: weekStart
      });
    } catch (err) {
      console.error('Error marking prize as viewed:', err);
    }

    setShowModal(false);
  };

  return {
    showModal,
    winners,
    myPosition,
    myPrize,
    isLoading,
    markAsSeen
  };
}

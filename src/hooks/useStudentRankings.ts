import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';

interface RankedStudent {
  student_id: string;
  student_name: string;
  avatar: string | null;
  total_xp: number;
  koins: number;
  current_streak_days: number;
  rank_position: number;
  equipped_avatar_emoji: string | null;
  equipped_avatar_rarity: string | null;
  equipped_avatar_image_url: string | null;
}

interface WeeklyRankedStudent {
  student_id: string;
  student_name: string;
  avatar: string | null;
  weekly_xp: number;
  rank_position: number;
  equipped_avatar_emoji: string | null;
  equipped_avatar_rarity: string | null;
  equipped_avatar_image_url: string | null;
}

interface StudentRankings {
  topXP: RankedStudent[];
  topWeeklyXP: WeeklyRankedStudent[];
  topKoins: RankedStudent[];
  topStreak: RankedStudent[];
  myXPPosition: number | null;
  myWeeklyXPPosition: number | null;
  myKoinsPosition: number | null;
  myStreakPosition: number | null;
  isLoading: boolean;
}

export function useStudentRankings(studentId?: string, limit: number = 10): StudentRankings {
  const { currentSchool } = useSchool();

  // Top XP (total acumulado)
  const { data: topXP = [], isLoading: loadingXP } = useQuery({
    queryKey: ['rankings', 'xp', currentSchool?.id, limit],
    queryFn: async () => {
      if (!currentSchool?.id) return [];
      const { data, error } = await supabase.rpc('get_school_rankings', {
        school_id_param: currentSchool.id,
        ranking_type: 'xp',
        limit_count: limit
      });
      if (error) throw error;
      return data as RankedStudent[];
    },
    enabled: !!currentSchool?.id,
  });

  // Top XP Semanal (novo)
  const { data: topWeeklyXP = [], isLoading: loadingWeeklyXP } = useQuery({
    queryKey: ['rankings', 'weekly-xp', currentSchool?.id, limit],
    queryFn: async () => {
      if (!currentSchool?.id) return [];
      const { data, error } = await supabase.rpc('get_weekly_xp_rankings', {
        p_school_id: currentSchool.id,
        p_limit: limit
      });
      if (error) {
        console.error('Error fetching weekly XP rankings:', error);
        return [];
      }
      return (data || []) as WeeklyRankedStudent[];
    },
    enabled: !!currentSchool?.id,
  });

  // Top Koins
  const { data: topKoins = [], isLoading: loadingKoins } = useQuery({
    queryKey: ['rankings', 'koins', currentSchool?.id, limit],
    queryFn: async () => {
      if (!currentSchool?.id) return [];
      const { data, error } = await supabase.rpc('get_school_rankings', {
        school_id_param: currentSchool.id,
        ranking_type: 'koins',
        limit_count: limit
      });
      if (error) throw error;
      return data as RankedStudent[];
    },
    enabled: !!currentSchool?.id,
  });

  // Top Streak
  const { data: topStreak = [], isLoading: loadingStreak } = useQuery({
    queryKey: ['rankings', 'streak', currentSchool?.id, limit],
    queryFn: async () => {
      if (!currentSchool?.id) return [];
      const { data, error } = await supabase.rpc('get_school_rankings', {
        school_id_param: currentSchool.id,
        ranking_type: 'streak',
        limit_count: limit
      });
      if (error) throw error;
      return data as RankedStudent[];
    },
    enabled: !!currentSchool?.id,
  });

  // Encontrar posição do aluno nos rankings
  const myXPPosition = studentId ? topXP.findIndex(s => s.student_id === studentId) + 1 : null;
  const myWeeklyXPPosition = studentId ? topWeeklyXP.findIndex(s => s.student_id === studentId) + 1 : null;
  const myKoinsPosition = studentId ? topKoins.findIndex(s => s.student_id === studentId) + 1 : null;
  const myStreakPosition = studentId ? topStreak.findIndex(s => s.student_id === studentId) + 1 : null;

  return {
    topXP,
    topWeeklyXP,
    topKoins,
    topStreak,
    myXPPosition: myXPPosition || null,
    myWeeklyXPPosition: myWeeklyXPPosition || null,
    myKoinsPosition: myKoinsPosition || null,
    myStreakPosition: myStreakPosition || null,
    isLoading: loadingXP || loadingWeeklyXP || loadingKoins || loadingStreak,
  };
}

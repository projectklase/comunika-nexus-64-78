import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useRewardsStore } from './rewards-store';
import { supabase } from '@/integrations/supabase/client';

interface GamificationData {
  lastCheckIn: string; // YYYY-MM-DD
  streak: number;
  xp: number;
  forgiveness: {
    available: boolean;
    lastReset: string; // YYYY-MM-DD of last Monday
  };
  week: Record<string, boolean>; // date -> checked in
  activityXP: Record<string, boolean>; // activityId -> rewarded
}

interface GamificationStore extends GamificationData {
  checkIn: () => { success: boolean; xpGained: number; streakCount: number; updatedWeek: Record<string, boolean> };
  useForgiveness: () => boolean;
  addActivityXP: (activityId: string, customXP?: number) => number;
  addFocusXP: (type: 'start' | 'complete') => number;
  resetIfNeeded: () => void;
  syncToDatabase: (userId: string, overrideWeek?: Record<string, boolean>) => Promise<void>;
  loadFromDatabase: (userId: string) => Promise<void>;
  // Integration with Koins system
  syncWithKoins: (studentId: string) => void;
}

const getToday = () => new Date().toISOString().split('T')[0];
const getLastMonday = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
};

const getWeekDates = () => {
  const today = new Date();
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const diffDays = (date1: string, date2: string) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
};

export const useStudentGamification = create<GamificationStore>()(
  persist(
    (set, get) => ({
      lastCheckIn: '',
      streak: 0,
      xp: 0,
      forgiveness: {
        available: true,
        lastReset: getLastMonday()
      },
      week: {},
      activityXP: {},

      resetIfNeeded: () => {
        const state = get();
        const today = getToday();
        const lastMonday = getLastMonday();
        
        // Reset forgiveness weekly
        if (state.forgiveness.lastReset !== lastMonday) {
          set(state => ({
            forgiveness: {
              available: true,
              lastReset: lastMonday
            }
          }));
        }

        // Clean old week entries (keep only last 7 days)
        const weekDates = getWeekDates();
        const cleanedWeek: Record<string, boolean> = {};
        weekDates.forEach(date => {
          if (state.week[date]) {
            cleanedWeek[date] = true;
          }
        });
        
        if (Object.keys(cleanedWeek).length !== Object.keys(state.week).length) {
          set({ week: cleanedWeek });
        }
      },

      checkIn: () => {
        const state = get();
        const today = getToday();
        const gap = state.lastCheckIn ? diffDays(today, state.lastCheckIn) : 999;

        if (gap === 0) {
          return { success: false, xpGained: 0, streakCount: state.streak, updatedWeek: state.week };
        }

        let newStreak = state.streak;
        let xpGained = 10;

        if (gap === 1) {
          // Perfect continuation
          newStreak = state.streak + 1;
        } else if (gap === 2 && state.forgiveness.available) {
          // Can use forgiveness - don't break streak but don't give XP
          xpGained = 0;
        } else {
          // Streak broken
          newStreak = 1;
        }

        // CORREÇÃO: Criar o week atualizado ANTES do set
        const updatedWeek = { ...state.week, [today]: true };

        set(state => ({
          lastCheckIn: today,
          streak: newStreak,
          xp: state.xp + xpGained,
          week: updatedWeek
        }));

        // Retornar o week atualizado para sincronização imediata
        return { success: true, xpGained, streakCount: newStreak, updatedWeek };
      },

      syncToDatabase: async (userId: string, overrideWeek?: Record<string, boolean>) => {
        const state = get();
        // CORREÇÃO: Usar overrideWeek se fornecido para evitar race condition
        const weekToSync = overrideWeek || state.week;
        
        try {
          console.log('[syncToDatabase] Sincronizando week:', JSON.stringify(weekToSync));
          
          // IMPORTANTE: NÃO sincronizamos total_xp aqui para evitar sobrescrever valores
          // que foram atualizados por RPCs (batalhas, desafios, reciclagem).
          // O XP é gerenciado exclusivamente pelo banco de dados via RPCs.
          const { error } = await supabase
            .from('profiles')
            .update({
              // total_xp: state.xp, // REMOVIDO - evita race conditions com RPCs
              current_streak_days: state.streak,
              best_streak_days: Math.max(state.streak, 0),
              last_activity_date: getToday(),
              weekly_checkins: weekToSync
            })
            .eq('id', userId);

          if (error) {
            console.error('[syncToDatabase] Error syncing to database:', error);
          } else {
            console.log('[syncToDatabase] ✅ Dados sincronizados com banco, week:', Object.keys(weekToSync).length, 'dias');
          }
        } catch (err) {
          console.error('[syncToDatabase] Exception syncing to database:', err);
        }
      },

      loadFromDatabase: async (userId: string) => {
        try {
          console.log('[loadFromDatabase] Carregando dados de gamificação do banco...');
          
          const { data, error } = await supabase
            .from('profiles')
            .select('total_xp, current_streak_days, weekly_checkins, last_activity_date')
            .eq('id', userId)
            .single();

          if (error) {
            console.error('[loadFromDatabase] Erro ao carregar:', error);
            return;
          }

          if (data) {
            // Parse weekly_checkins safely
            let weekData: Record<string, boolean> = {};
            if (data.weekly_checkins && typeof data.weekly_checkins === 'object') {
              weekData = data.weekly_checkins as Record<string, boolean>;
            }

            set({
              xp: data.total_xp || 0,
              streak: data.current_streak_days || 0,
              lastCheckIn: data.last_activity_date || '',
              week: weekData
            });

            console.log('[loadFromDatabase] ✅ Dados carregados:', {
              xp: data.total_xp,
              streak: data.current_streak_days,
              weekDays: Object.keys(weekData).length
            });
          }
        } catch (err) {
          console.error('[loadFromDatabase] Exception:', err);
        }
      },

      useForgiveness: () => {
        const state = get();
        const today = getToday();
        
        if (!state.forgiveness.available) return false;

        set(state => ({
          lastCheckIn: today,
          week: {
            ...state.week,
            [today]: true
          },
          forgiveness: {
            ...state.forgiveness,
            available: false
          }
        }));

        return true;
      },

      addActivityXP: (activityId: string, customXP?: number) => {
        const state = get();
        if (state.activityXP[activityId]) return 0;

        const xpGained = customXP || 10; // Use custom XP or fallback to 10
        set(state => ({
          xp: state.xp + xpGained,
          activityXP: {
            ...state.activityXP,
            [activityId]: true
          }
        }));

        return xpGained;
      },

      addFocusXP: (type: 'start' | 'complete') => {
        const xpGained = type === 'start' ? 5 : 10;
        set(state => ({
          xp: state.xp + xpGained
        }));
        return xpGained;
      },

      syncWithKoins: async (studentId: string) => {
        // This method can be used to sync XP with Koin balance if needed
        // For now, both systems work independently but show together in UI
        const rewardsState = useRewardsStore.getState();
        await rewardsState.loadStudentBalance(studentId);
        const balance = rewardsState.getStudentBalance(studentId);
        
        // Optional: Could add bonus XP based on Koin milestones
        // Example: Every 100 Koins = 50 bonus XP
        const milestoneXP = Math.floor(balance.totalEarned / 100) * 50;
        
        set(state => {
          const currentMilestoneXP = Math.floor((state.xp - (state.xp % 50)) / 50) * 50;
          const newXP = milestoneXP - currentMilestoneXP;
          
          return newXP > 0 ? {
            xp: state.xp + newXP
          } : state;
        });
      }
    }),
    {
      name: 'student-gamification'
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GamificationData {
  lastCheckIn: string; // YYYY-MM-DD
  streak: number;
  xp: number;
  forgiveness: {
    available: boolean;
    lastReset: string; // YYYY-MM-DD of last Monday
  };
  week: Record<string, boolean>; // date -> checked in
  dailyMission: {
    id: string;
    date: string;
    done: boolean;
  };
  activityXP: Record<string, boolean>; // activityId -> rewarded
}

interface GamificationStore extends GamificationData {
  checkIn: () => { success: boolean; xpGained: number; streakCount: number };
  useForgiveness: () => boolean;
  completeDailyMission: () => number;
  addActivityXP: (activityId: string) => number;
  addFocusXP: (type: 'start' | 'complete') => number;
  resetIfNeeded: () => void;
}

const MISSIONS = [
  { id: 'openDayFocus', label: 'Abrir Dia em Foco' },
  { id: 'markOneDelivered', label: 'Marcar uma atividade como entregue' },
  { id: 'startFocus25', label: 'Iniciar um foco de 25 min' }
];

const getToday = () => new Date().toISOString().split('T')[0];
const getLastMonday = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
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
      dailyMission: {
        id: '',
        date: '',
        done: false
      },
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

        // Set daily mission if needed
        if (state.dailyMission.date !== today) {
          const randomMission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
          set(state => ({
            dailyMission: {
              id: randomMission.id,
              date: today,
              done: false
            }
          }));
        }
      },

      checkIn: () => {
        const state = get();
        const today = getToday();
        const gap = state.lastCheckIn ? diffDays(today, state.lastCheckIn) : 999;

        if (gap === 0) {
          return { success: false, xpGained: 0, streakCount: state.streak };
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

        set(state => ({
          lastCheckIn: today,
          streak: newStreak,
          xp: state.xp + xpGained,
          week: {
            ...state.week,
            [today]: true
          }
        }));

        return { success: true, xpGained, streakCount: newStreak };
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

      completeDailyMission: () => {
        const state = get();
        if (state.dailyMission.done) return 0;

        const xpGained = 20;
        set(state => ({
          xp: state.xp + xpGained,
          dailyMission: {
            ...state.dailyMission,
            done: true
          }
        }));

        return xpGained;
      },

      addActivityXP: (activityId: string) => {
        const state = get();
        if (state.activityXP[activityId]) return 0;

        const xpGained = 10;
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
      }
    }),
    {
      name: 'student-gamification'
    }
  )
);
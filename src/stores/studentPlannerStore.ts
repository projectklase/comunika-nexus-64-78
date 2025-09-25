import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlannedBlock {
  id: string;
  postId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  turmaId?: string;
  createdAt: string;
  type: 'study' | 'execution' | 'review';
}

export interface PlannerPreferences {
  blockSize: 30 | 60; // minutes
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'all';
  autoSuggestionsEnabled: boolean;
  colors: {
    study: string;
    execution: string;
    review: string;
  };
}

export interface StudentPlannerState {
  plannedBlocks: PlannedBlock[];
  preferences: PlannerPreferences;
  
  // Actions
  addBlock: (block: Omit<PlannedBlock, 'id' | 'createdAt'>) => void;
  updateBlock: (blockId: string, updates: Partial<PlannedBlock>) => void;
  removeBlock: (blockId: string) => void;
  moveBlock: (blockId: string, newDate: string, newStartTime: string) => void;
  getBlocksForDate: (date: string) => PlannedBlock[];
  getBlocksForWeek: (startDate: string) => PlannedBlock[];
  updatePreferences: (updates: Partial<PlannerPreferences>) => void;
  
  // Utility
  hasConflict: (date: string, startTime: string, endTime: string, excludeId?: string) => boolean;
  suggestTimeSlots: (date: string, duration: number) => Array<{ startTime: string; endTime: string }>;
}

const defaultPreferences: PlannerPreferences = {
  blockSize: 60,
  preferredStudyTime: 'afternoon',
  autoSuggestionsEnabled: true,
  colors: {
    study: 'hsl(var(--primary))',
    execution: 'hsl(var(--secondary))',
    review: 'hsl(var(--accent))'
  }
};

// Time slot utilities
const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const addMinutes = (timeStr: string, minutes: number): string => {
  const totalMinutes = parseTime(timeStr) + minutes;
  return formatTime(totalMinutes);
};

export const useStudentPlannerStore = create<StudentPlannerState>()(
  persist(
    (set, get) => ({
      plannedBlocks: [],
      preferences: defaultPreferences,

      addBlock: (blockData) => {
        const block: PlannedBlock = {
          ...blockData,
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString()
        };

        set(state => ({
          plannedBlocks: [...state.plannedBlocks, block]
        }));
      },

      updateBlock: (blockId, updates) => {
        set(state => ({
          plannedBlocks: state.plannedBlocks.map(block =>
            block.id === blockId ? { ...block, ...updates } : block
          )
        }));
      },

      removeBlock: (blockId) => {
        set(state => ({
          plannedBlocks: state.plannedBlocks.filter(block => block.id !== blockId)
        }));
      },

      moveBlock: (blockId, newDate, newStartTime) => {
        const block = get().plannedBlocks.find(b => b.id === blockId);
        if (!block) return;

        const duration = parseTime(block.endTime) - parseTime(block.startTime);
        const newEndTime = addMinutes(newStartTime, duration);

        get().updateBlock(blockId, {
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime
        });
      },

      getBlocksForDate: (date) => {
        return get().plannedBlocks.filter(block => block.date === date);
      },

      getBlocksForWeek: (startDate) => {
        const start = new Date(startDate);
        const dates = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          return date.toISOString().split('T')[0];
        });

        return get().plannedBlocks.filter(block => dates.includes(block.date));
      },

      updatePreferences: (updates) => {
        set(state => ({
          preferences: { ...state.preferences, ...updates }
        }));
      },

      hasConflict: (date, startTime, endTime, excludeId) => {
        const blocks = get().getBlocksForDate(date);
        const newStart = parseTime(startTime);
        const newEnd = parseTime(endTime);

        return blocks.some(block => {
          if (excludeId && block.id === excludeId) return false;
          
          const blockStart = parseTime(block.startTime);
          const blockEnd = parseTime(block.endTime);
          
          return (newStart < blockEnd && newEnd > blockStart);
        });
      },

      suggestTimeSlots: (date, duration) => {
        const blocks = get().getBlocksForDate(date);
        const preferences = get().preferences;
        const slots: Array<{ startTime: string; endTime: string }> = [];

        // Define time windows based on preferences
        const timeWindows = {
          morning: { start: 8 * 60, end: 12 * 60 }, // 8:00 - 12:00
          afternoon: { start: 13 * 60, end: 18 * 60 }, // 13:00 - 18:00
          evening: { start: 19 * 60, end: 22 * 60 }, // 19:00 - 22:00
          all: { start: 8 * 60, end: 22 * 60 } // 8:00 - 22:00
        };

        const window = timeWindows[preferences.preferredStudyTime];
        const blockSize = preferences.blockSize;

        // Generate possible slots
        for (let time = window.start; time <= window.end - duration; time += blockSize) {
          const startTime = formatTime(time);
          const endTime = formatTime(time + duration);
          
          // Check if this slot conflicts with existing blocks
          if (!get().hasConflict(date, startTime, endTime)) {
            slots.push({ startTime, endTime });
          }
        }

        return slots.slice(0, 5); // Return top 5 suggestions
      }
    }),
    {
      name: 'student-planner-storage',
      version: 1
    }
  )
);
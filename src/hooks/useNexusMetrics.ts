import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MetricEvent {
  id: string;
  type: 'drag' | 'accept' | 'snooze' | 'quickadd' | 'voice' | 'shortcuts';
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface NexusMetrics {
  totalActions: number;
  dragCount: number;
  acceptCount: number;
  snoozeCount: number;
  quickAddCount: number;
  voiceCount: number;
  shortcutsCount: number;
  streakDays: number;
  lastActionDate: string;
  efficiency: number; // 0-1 score
}

interface NexusMetricsState {
  events: MetricEvent[];
  metrics: NexusMetrics;
  
  // Actions
  trackEvent: (type: MetricEvent['type'], action: string, metadata?: Record<string, any>) => void;
  getMetrics: () => NexusMetrics;
  getRecentEvents: (hours?: number) => MetricEvent[];
  calculateEfficiency: () => number;
  resetMetrics: () => void;
}

const initialMetrics: NexusMetrics = {
  totalActions: 0,
  dragCount: 0,
  acceptCount: 0,
  snoozeCount: 0,
  quickAddCount: 0,
  voiceCount: 0,
  shortcutsCount: 0,
  streakDays: 0,
  lastActionDate: '',
  efficiency: 0
};

export const useNexusMetrics = create<NexusMetricsState>()(
  persist(
    (set, get) => ({
      events: [],
      metrics: initialMetrics,

      trackEvent: (type, action, metadata = {}) => {
        const event: MetricEvent = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          action,
          timestamp: new Date().toISOString(),
          metadata
        };

        set(state => {
          const newEvents = [...state.events, event].slice(-100); // Keep only last 100 events
          const newMetrics = { ...state.metrics };
          
          // Update counters
          newMetrics.totalActions++;
          
          switch (type) {
            case 'drag':
              newMetrics.dragCount++;
              break;
            case 'accept':
              newMetrics.acceptCount++;
              break;
            case 'snooze':
              newMetrics.snoozeCount++;
              break;
            case 'quickadd':
              newMetrics.quickAddCount++;
              break;
            case 'voice':
              newMetrics.voiceCount++;
              break;
            case 'shortcuts':
              newMetrics.shortcutsCount++;
              break;
          }
          
          // Update streak
          const today = new Date().toISOString().split('T')[0];
          const lastActionDate = newMetrics.lastActionDate?.split('T')[0];
          
          if (lastActionDate === today) {
            // Same day, streak continues
          } else if (lastActionDate) {
            const dayDiff = (new Date(today).getTime() - new Date(lastActionDate).getTime()) / (1000 * 60 * 60 * 24);
            
            if (dayDiff === 1) {
              // Consecutive day
              newMetrics.streakDays++;
            } else if (dayDiff > 1) {
              // Streak broken
              newMetrics.streakDays = 1;
            }
          } else {
            // First action
            newMetrics.streakDays = 1;
          }
          
          newMetrics.lastActionDate = event.timestamp;
          
          // Calculate efficiency
          newMetrics.efficiency = get().calculateEfficiency();
          
          return {
            events: newEvents,
            metrics: newMetrics
          };
        });
      },

      getMetrics: () => {
        return get().metrics;
      },

      getRecentEvents: (hours = 24) => {
        const now = new Date();
        const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
        
        return get().events.filter(event => 
          new Date(event.timestamp) >= cutoff
        );
      },

      calculateEfficiency: () => {
        const state = get();
        const recentEvents = state.getRecentEvents(24);
        
        if (recentEvents.length === 0) return 0;
        
        // Calculate efficiency based on action types
        let score = 0;
        const weights = {
          accept: 3,    // High value - completing suggested tasks
          quickadd: 2,  // Medium value - proactive planning
          drag: 1,      // Low value - manual organization
          voice: 2,     // Medium value - efficient input
          shortcuts: 1, // Low value - navigation
          snooze: -1    // Negative value - procrastination
        };
        
        recentEvents.forEach(event => {
          score += weights[event.type] || 0;
        });
        
        // Normalize to 0-1 scale
        const maxPossibleScore = recentEvents.length * 3;
        const efficiency = maxPossibleScore > 0 ? Math.max(0, Math.min(1, (score + maxPossibleScore) / (2 * maxPossibleScore))) : 0;
        
        return Math.round(efficiency * 100) / 100;
      },

      resetMetrics: () => {
        set({
          events: [],
          metrics: initialMetrics
        });
      }
    }),
    {
      name: 'nexus-metrics-storage',
      version: 1,
      // Only persist metrics, not events (to avoid large storage)
      partialize: (state) => ({ 
        metrics: state.metrics,
        events: state.events.slice(-20) // Only last 20 events
      })
    }
  )
);

// Helper hook for tracking common actions
export function useMetricsTracker() {
  const { trackEvent } = useNexusMetrics();
  
  return {
    trackDrag: (from: string, to: string) => 
      trackEvent('drag', 'block_moved', { from, to }),
    
    trackAccept: (suggestionType: string, count?: number) => 
      trackEvent('accept', 'suggestion_accepted', { suggestionType, count }),
    
    trackSnooze: (reason?: string) => 
      trackEvent('snooze', 'task_snoozed', { reason }),
    
    trackQuickAdd: (method: 'text' | 'voice', parsed: any) => 
      trackEvent('quickadd', 'task_created', { method, parsed }),
    
    trackVoice: (command: string, success: boolean) => 
      trackEvent('voice', 'voice_command', { command, success }),
    
    trackShortcut: (key: string, action: string) => 
      trackEvent('shortcuts', 'keyboard_shortcut', { key, action })
  };
}
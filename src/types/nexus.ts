export interface NexusStep {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  order: number;
  estimatedMinutes: number;
}

export interface ActivityTrail {
  activityId: string;
  steps: NexusStep[];
  currentStepIndex: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyBlock {
  id: string;
  activityId: string;
  stepId?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // minutes
  type: 'study' | 'focus' | 'review';
  status: 'scheduled' | 'in-progress' | 'completed' | 'skipped';
  createdAt: string;
}

export interface FocusSession {
  id: string;
  activityId: string;
  stepId?: string;
  duration: number; // minutes: 25, 40, 60
  startedAt: string;
  pausedAt?: string;
  completedAt?: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  pauseReasons: Array<{
    pausedAt: string;
    resumedAt?: string;
    reason?: string;
  }>;
}

export interface UserPreferences {
  preferredFocusDuration: 25 | 40 | 60;
  studyTimeWindows: {
    morning: boolean; // 6-12h
    afternoon: boolean; // 12-18h
    evening: boolean; // 18-24h
  };
  reducedMotion: boolean;
  enableMicroBreaks: boolean;
}

export interface NexusState {
  trails: Record<string, ActivityTrail>; // activityId -> trail
  studyBlocks: StudyBlock[];
  activeFocusSession?: FocusSession;
  preferences: UserPreferences;
  lastSync: string;
}

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface UrgencyInfo {
  level: UrgencyLevel;
  hoursUntilDue: number;
  message: string;
}
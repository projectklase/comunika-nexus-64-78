import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NexusState, ActivityTrail, StudyBlock, FocusSession, UserPreferences } from '@/types/nexus';

interface NexusStore extends NexusState {
  // Trail actions
  createTrail: (activityId: string, title: string, description?: string) => void;
  updateTrail: (activityId: string, trail: Partial<ActivityTrail>) => void;
  completeStep: (activityId: string, stepIndex: number) => void;
  updateStep: (activityId: string, stepIndex: number, step: Partial<any>) => void;
  reorderSteps: (activityId: string, fromIndex: number, toIndex: number) => void;
  
  // Study block actions
  scheduleStudyBlock: (block: Omit<StudyBlock, 'id' | 'createdAt'>) => void;
  updateStudyBlock: (blockId: string, updates: Partial<StudyBlock>) => void;
  postponeStudyBlock: (blockId: string, newStartTime: string) => void;
  
  // Focus session actions
  startFocusSession: (activityId: string, stepId: string | undefined, duration: number) => void;
  pauseFocusSession: (reason?: string) => void;
  resumeFocusSession: () => void;
  completeFocusSession: () => void;
  abandonFocusSession: () => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  
  // Utility
  getTrailProgress: (activityId: string) => number;
  getNextStep: (activityId: string) => any | null;
  getUrgentActivities: () => string[];
}

const defaultPreferences: UserPreferences = {
  preferredFocusDuration: 25,
  studyTimeWindows: {
    morning: true,
    afternoon: true,
    evening: false
  },
  reducedMotion: false,
  enableMicroBreaks: true
};

// Generate trail steps from activity title/description using simple heuristics
const generateTrailSteps = (title: string, description?: string) => {
  const steps = [];
  let stepOrder = 0;

  // Basic heuristic based on activity type and content
  const isProva = title.toLowerCase().includes('prova') || title.toLowerCase().includes('exame');
  const isTrabalho = title.toLowerCase().includes('trabalho') || title.toLowerCase().includes('projeto');
  const isAtividade = !isProva && !isTrabalho;

  if (isProva) {
    steps.push(
      { id: `step-${stepOrder++}`, title: 'Revisar conteúdo', description: 'Revisar materiais e anotações', completed: false, order: stepOrder - 1, estimatedMinutes: 30 },
      { id: `step-${stepOrder++}`, title: 'Resolver exercícios', description: 'Praticar com exercícios similares', completed: false, order: stepOrder - 1, estimatedMinutes: 45 },
      { id: `step-${stepOrder++}`, title: 'Revisão final', description: 'Última revisão antes da prova', completed: false, order: stepOrder - 1, estimatedMinutes: 20 }
    );
  } else if (isTrabalho) {
    steps.push(
      { id: `step-${stepOrder++}`, title: 'Pesquisar e planejar', description: 'Coletar informações e criar estrutura', completed: false, order: stepOrder - 1, estimatedMinutes: 40 },
      { id: `step-${stepOrder++}`, title: 'Desenvolvimento', description: 'Criar o conteúdo principal', completed: false, order: stepOrder - 1, estimatedMinutes: 60 },
      { id: `step-${stepOrder++}`, title: 'Revisar e formatar', description: 'Revisão e formatação final', completed: false, order: stepOrder - 1, estimatedMinutes: 25 },
      { id: `step-${stepOrder++}`, title: 'Submeter', description: 'Enviar o trabalho', completed: false, order: stepOrder - 1, estimatedMinutes: 5 }
    );
  } else {
    // Atividade geral
    steps.push(
      { id: `step-${stepOrder++}`, title: 'Entender', description: 'Ler e compreender os requisitos', completed: false, order: stepOrder - 1, estimatedMinutes: 15 },
      { id: `step-${stepOrder++}`, title: 'Produzir', description: 'Executar a atividade', completed: false, order: stepOrder - 1, estimatedMinutes: 40 },
      { id: `step-${stepOrder++}`, title: 'Revisar', description: 'Verificar e corrigir', completed: false, order: stepOrder - 1, estimatedMinutes: 15 },
      { id: `step-${stepOrder++}`, title: 'Enviar', description: 'Submeter a atividade', completed: false, order: stepOrder - 1, estimatedMinutes: 5 }
    );
  }

  return steps;
};

export const useNexusStore = create<NexusStore>()(
  persist(
    (set, get) => ({
      trails: {},
      studyBlocks: [],
      activeFocusSession: undefined,
      preferences: defaultPreferences,
      lastSync: new Date().toISOString(),

      createTrail: (activityId: string, title: string, description?: string) => {
        const existing = get().trails[activityId];
        if (existing) return; // Never overwrite existing trail

        const steps = generateTrailSteps(title, description);
        const trail: ActivityTrail = {
          activityId,
          steps,
          currentStepIndex: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        set(state => ({
          trails: { ...state.trails, [activityId]: trail }
        }));
      },

      updateTrail: (activityId: string, trailUpdates: Partial<ActivityTrail>) => {
        set(state => ({
          trails: {
            ...state.trails,
            [activityId]: {
              ...state.trails[activityId],
              ...trailUpdates,
              updatedAt: new Date().toISOString()
            }
          }
        }));
      },

      completeStep: (activityId: string, stepIndex: number) => {
        const trail = get().trails[activityId];
        if (!trail || !trail.steps[stepIndex]) return;

        const updatedSteps = [...trail.steps];
        updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], completed: true };

        // Advance to next step if available
        const nextStepIndex = stepIndex + 1 < updatedSteps.length ? stepIndex + 1 : trail.currentStepIndex;

        set(state => ({
          trails: {
            ...state.trails,
            [activityId]: {
              ...trail,
              steps: updatedSteps,
              currentStepIndex: nextStepIndex,
              updatedAt: new Date().toISOString()
            }
          }
        }));
      },

      updateStep: (activityId: string, stepIndex: number, stepUpdates: Partial<any>) => {
        const trail = get().trails[activityId];
        if (!trail || !trail.steps[stepIndex]) return;

        const updatedSteps = [...trail.steps];
        updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...stepUpdates };

        get().updateTrail(activityId, { steps: updatedSteps });
      },

      reorderSteps: (activityId: string, fromIndex: number, toIndex: number) => {
        const trail = get().trails[activityId];
        if (!trail) return;

        const updatedSteps = [...trail.steps];
        const [movedStep] = updatedSteps.splice(fromIndex, 1);
        updatedSteps.splice(toIndex, 0, movedStep);

        // Update order numbers
        updatedSteps.forEach((step, index) => {
          step.order = index;
        });

        get().updateTrail(activityId, { steps: updatedSteps });
      },

      scheduleStudyBlock: (blockData) => {
        const block: StudyBlock = {
          ...blockData,
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString()
        };

        set(state => ({
          studyBlocks: [...state.studyBlocks, block]
        }));
      },

      updateStudyBlock: (blockId: string, updates: Partial<StudyBlock>) => {
        set(state => ({
          studyBlocks: state.studyBlocks.map(block =>
            block.id === blockId ? { ...block, ...updates } : block
          )
        }));
      },

      postponeStudyBlock: (blockId: string, newStartTime: string) => {
        const block = get().studyBlocks.find(b => b.id === blockId);
        if (!block) return;

        const duration = block.duration;
        const newEndTime = new Date(new Date(newStartTime).getTime() + duration * 60000).toISOString();

        get().updateStudyBlock(blockId, {
          startTime: newStartTime,
          endTime: newEndTime
        });
      },

      startFocusSession: (activityId: string, stepId: string | undefined, duration: number) => {
        const session: FocusSession = {
          id: `focus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          activityId,
          stepId,
          duration,
          startedAt: new Date().toISOString(),
          status: 'active',
          pauseReasons: []
        };

        set({ activeFocusSession: session });
      },

      pauseFocusSession: (reason?: string) => {
        const session = get().activeFocusSession;
        if (!session || session.status !== 'active') return;

        const now = new Date().toISOString();
        set({
          activeFocusSession: {
            ...session,
            status: 'paused',
            pausedAt: now,
            pauseReasons: [...session.pauseReasons, { pausedAt: now, reason }]
          }
        });
      },

      resumeFocusSession: () => {
        const session = get().activeFocusSession;
        if (!session || session.status !== 'paused') return;

        const now = new Date().toISOString();
        const updatedReasons = [...session.pauseReasons];
        const lastPause = updatedReasons[updatedReasons.length - 1];
        if (lastPause && !lastPause.resumedAt) {
          lastPause.resumedAt = now;
        }

        set({
          activeFocusSession: {
            ...session,
            status: 'active',
            pausedAt: undefined,
            pauseReasons: updatedReasons
          }
        });
      },

      completeFocusSession: () => {
        const session = get().activeFocusSession;
        if (!session) return;

        set({
          activeFocusSession: {
            ...session,
            status: 'completed',
            completedAt: new Date().toISOString()
          }
        });

        // Clear active session after a short delay to show completion
        setTimeout(() => {
          set({ activeFocusSession: undefined });
        }, 2000);
      },

      abandonFocusSession: () => {
        set({ activeFocusSession: undefined });
      },

      updatePreferences: (preferenceUpdates: Partial<UserPreferences>) => {
        set(state => ({
          preferences: { ...state.preferences, ...preferenceUpdates }
        }));
      },

      getTrailProgress: (activityId: string): number => {
        const trail = get().trails[activityId];
        if (!trail || trail.steps.length === 0) return 0;

        const completedSteps = trail.steps.filter(step => step.completed).length;
        return Math.round((completedSteps / trail.steps.length) * 100);
      },

      getNextStep: (activityId: string) => {
        const trail = get().trails[activityId];
        if (!trail) return null;

        return trail.steps[trail.currentStepIndex] || null;
      },

      getUrgentActivities: (): string[] => {
        const trails = get().trails;
        return Object.keys(trails).filter(activityId => {
          const trail = trails[activityId];
          return trail && !trail.completedAt && trail.steps.some(step => !step.completed);
        });
      }
    }),
    {
      name: 'nexus-storage',
      version: 1
    }
  )
);
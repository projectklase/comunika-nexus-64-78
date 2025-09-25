import { create } from 'zustand';
import { SchoolSettings, SchoolSettingsStore } from '@/types/school-settings';

const STORAGE_KEY = 'school-settings';

// Simular school_slug ativo (em uma implementação real, viria do contexto de autenticação)
const getCurrentSchoolSlug = (): string => {
  // Por agora, usar um valor padrão - em produção seria obtido do contexto de auth
  return 'escola-padrao';
};

const createDefaultSettings = (schoolSlug: string): SchoolSettings => ({
  schoolSlug,
  weightsEnabled: true, // Padrão: habilitado
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useSchoolSettingsStore = create<SchoolSettingsStore>((set, get) => ({
  settings: {},

  getSchoolSettings: (schoolSlug: string) => {
    const { settings } = get();
    
    if (!settings[schoolSlug]) {
      const defaultSettings = createDefaultSettings(schoolSlug);
      set((state) => ({
        settings: {
          ...state.settings,
          [schoolSlug]: defaultSettings
        }
      }));
      get().saveToStorage();
      return defaultSettings;
    }
    
    return settings[schoolSlug];
  },

  updateSchoolSettings: (schoolSlug: string, updates: Partial<SchoolSettings>) => {
    set((state) => {
      const currentSettings = state.settings[schoolSlug] || createDefaultSettings(schoolSlug);
      const updatedSettings = {
        ...currentSettings,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      return {
        settings: {
          ...state.settings,
          [schoolSlug]: updatedSettings
        }
      };
    });
    
    get().saveToStorage();
  },

  isWeightsEnabled: (schoolSlug: string) => {
    const settings = get().getSchoolSettings(schoolSlug);
    return settings.weightsEnabled;
  },

  getCurrentSchoolSettings: () => {
    const schoolSlug = getCurrentSchoolSlug();
    return get().getSchoolSettings(schoolSlug);
  },

  updateCurrentSchoolSettings: (updates: Partial<SchoolSettings>) => {
    const schoolSlug = getCurrentSchoolSlug();
    get().updateSchoolSettings(schoolSlug, updates);
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        set({ settings });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da escola:', error);
    }
  },

  saveToStorage: () => {
    try {
      const { settings } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Erro ao salvar configurações da escola:', error);
    }
  },
}));

/**
 * Helper global para verificar se pesos estão habilitados na escola atual
 */
export function isWeightsEnabled(): boolean {
  const schoolSlug = getCurrentSchoolSlug();
  return useSchoolSettingsStore.getState().isWeightsEnabled(schoolSlug);
}

/**
 * Helper para obter configurações da escola atual
 */
export function getCurrentSchoolSettings(): SchoolSettings | null {
  return useSchoolSettingsStore.getState().getCurrentSchoolSettings();
}

/**
 * Helper para atualizar configurações da escola atual
 */
export function updateCurrentSchoolSettings(updates: Partial<SchoolSettings>): void {
  const schoolSlug = getCurrentSchoolSlug();
  useSchoolSettingsStore.getState().updateSchoolSettings(schoolSlug, updates);
}
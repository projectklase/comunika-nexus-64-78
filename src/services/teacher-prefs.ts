import { ActivityType, ActivityMeta } from '@/types/post';
import { DEFAULT_SELECT_TOKENS } from '@/hooks/useSelectState';
import { isWeightsEnabled } from '@/stores/school-settings-store';

export interface TeacherActivityDefaults {
  defaultType: ActivityType;
  defaultWeights: {
    ATIVIDADE: number | null;
    TRABALHO: number | null; 
    PROVA: number | null;
  };
  defaultFormats: string[];
  defaultDuration: number;
  defaultProofType: 'OBJETIVA' | 'DISCURSIVA' | 'MISTA';
  defaultLocation: string;
  defaultUsePeso: boolean;  // Toggle padrão para usar peso
}

export interface TeacherActivityFilters {
  selectedClass: string;
  sortBy: string;
  searchQuery: string;
}

export class TeacherPrefsService {
  private static readonly STORAGE_KEY = 'TeacherPrefs';
  private static readonly FILTERS_STORAGE_KEY = 'TeacherActivityFilters';

  static getDefaults(userId: string): TeacherActivityDefaults {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading teacher preferences:', error);
    }

    // Return sensible defaults based on school settings
    const weightsEnabledForSchool = isWeightsEnabled();
    const defaultWeight = weightsEnabledForSchool ? 1 : null;
    
    return {
      defaultType: 'ATIVIDADE',
      defaultWeights: {
        ATIVIDADE: weightsEnabledForSchool ? 1 : null,
        TRABALHO: weightsEnabledForSchool ? 2 : null,
        PROVA: weightsEnabledForSchool ? 3 : null
      },
      defaultFormats: ['PDF'],
      defaultDuration: 50,
      defaultProofType: 'DISCURSIVA',
      defaultLocation: '',
      defaultUsePeso: weightsEnabledForSchool  // Usar peso por padrão se habilitado na escola
    };
  }

  static saveDefaults(userId: string, prefs: TeacherActivityDefaults): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(prefs));
    } catch (error) {
      console.error('Error saving teacher preferences:', error);
    }
  }

  static getMetaDefaults(type: ActivityType, prefs: TeacherActivityDefaults): ActivityMeta & { usePeso?: boolean } {
    // Só incluir peso se estiver habilitado na escola, preferência do professor ativa, e peso não for null
    const schoolWeightsEnabled = isWeightsEnabled();
    const useWeight = schoolWeightsEnabled && prefs.defaultUsePeso && prefs.defaultWeights[type] !== null;
    const weight = useWeight ? prefs.defaultWeights[type] : null;
    const base = weight !== null ? { peso: weight, usePeso: schoolWeightsEnabled } : { usePeso: schoolWeightsEnabled };

    switch (type) {
      case 'ATIVIDADE':
        return base;
      case 'TRABALHO':
        return {
          ...base,
          formatosEntrega: prefs.defaultFormats as any[]
        };
      case 'PROVA':
        return {
          ...base,
          duracao: prefs.defaultDuration,
          tipoProva: prefs.defaultProofType,
          local: prefs.defaultLocation
        };
    }
  }

  // Filter preferences management
  static getActivityFilters(userId: string): TeacherActivityFilters {
    try {
      const stored = localStorage.getItem(`${this.FILTERS_STORAGE_KEY}_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate any empty/null/undefined values to proper tokens
        return this.migrateFilters(parsed);
      }
    } catch (error) {
      console.error('Error loading teacher activity filters:', error);
    }

    // Return safe defaults
    return {
      selectedClass: DEFAULT_SELECT_TOKENS.ALL_CLASSES,
      sortBy: DEFAULT_SELECT_TOKENS.DUE_DATE,
      searchQuery: ''
    };
  }

  static saveActivityFilters(userId: string, filters: TeacherActivityFilters): void {
    try {
      // Ensure no empty values are saved
      const safeFilters = this.migrateFilters(filters);
      localStorage.setItem(`${this.FILTERS_STORAGE_KEY}_${userId}`, JSON.stringify(safeFilters));
    } catch (error) {
      console.error('Error saving teacher activity filters:', error);
    }
  }

  private static migrateFilters(filters: Partial<TeacherActivityFilters>): TeacherActivityFilters {
    return {
      selectedClass: this.safeFilterValue(filters.selectedClass, DEFAULT_SELECT_TOKENS.ALL_CLASSES),
      sortBy: this.safeFilterValue(filters.sortBy, DEFAULT_SELECT_TOKENS.DUE_DATE),
      searchQuery: filters.searchQuery || ''
    };
  }

  private static safeFilterValue(value: string | null | undefined, defaultToken: string): string {
    if (!value || value === '' || value === 'undefined' || value === 'null') {
      return defaultToken;
    }
    return value;
  }

  static validateSelectComponents(): void {
    if (process.env.NODE_ENV !== 'development') return;

    // This will be called to validate Select components don't have empty values
    const selectElements = document.querySelectorAll('[data-radix-select-item]');
    selectElements.forEach((element) => {
      const value = element.getAttribute('data-value');
      if (value === '') {
        console.warn('Found Select item with empty value:', element);
      }
    });
  }
}

export interface ActivityDraft {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  body: string;
  classId: string;
  dueDate: string | null;
  dueTime: string;
  activityMeta: ActivityMeta & { usePeso?: boolean };
  savedAt: string;
}

export class DraftService {
  private static readonly STORAGE_KEY = 'ActivityDrafts';

  static saveDraft(userId: string, data: Omit<ActivityDraft, 'id' | 'userId' | 'savedAt'>): void {
    try {
      const draft: ActivityDraft = {
        id: `draft_${Date.now()}`,
        userId,
        ...data,
        savedAt: new Date().toISOString()
      };

      const existing = this.getDrafts(userId);
      const updated = [draft, ...existing.slice(0, 4)]; // Keep only 5 most recent
      
      localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }

  static getDrafts(userId: string): ActivityDraft[] {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      if (!stored) return [];
      
      const drafts = JSON.parse(stored);
      // Migrar rascunhos antigos para incluir usePeso
      return drafts.map((draft: ActivityDraft) => ({
        ...draft,
        activityMeta: {
          ...draft.activityMeta,
          usePeso: draft.activityMeta.usePeso !== undefined ? draft.activityMeta.usePeso : true
        }
      }));
    } catch (error) {
      console.error('Error loading drafts:', error);
      return [];
    }
  }

  static deleteDraft(userId: string, draftId: string): void {
    try {
      const drafts = this.getDrafts(userId);
      const updated = drafts.filter(d => d.id !== draftId);
      localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  }

  static clearDrafts(userId: string): void {
    try {
      localStorage.removeItem(`${this.STORAGE_KEY}_${userId}`);
    } catch (error) {
      console.error('Error clearing drafts:', error);
    }
  }
}
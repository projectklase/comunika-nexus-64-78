import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { SchoolSettings, SchoolSettingsStore } from '@/types/school-settings';

const STORAGE_KEY = 'school_settings';
const DEFAULT_SCHOOL_SLUG = 'default';

// Flag para prevenir múltiplas requisições simultâneas ao Supabase
let isLoadingFromSupabase = false;

export const useSchoolSettingsStore = create<SchoolSettingsStore>((set, get) => ({
  settings: {},

  getSchoolSettings: (schoolSlug: string) => {
    const settings = get().settings[schoolSlug];
    if (settings) return settings;

    // Return default settings if not found
    return {
      schoolSlug,
      weightsEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  updateSchoolSettings: (schoolSlug: string, updates: Partial<SchoolSettings>) => {
    set((state) => ({
      settings: {
        ...state.settings,
        [schoolSlug]: {
          ...state.getSchoolSettings(schoolSlug),
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
    get().saveToStorage();
    
    // Update Supabase asynchronously
    updateSupabaseSettings(updates).catch(console.error);
  },

  isWeightsEnabled: (schoolSlug: string) => {
    return get().getSchoolSettings(schoolSlug).weightsEnabled;
  },

  getCurrentSchoolSettings: () => {
    return get().getSchoolSettings(DEFAULT_SCHOOL_SLUG);
  },

  updateCurrentSchoolSettings: (updates: Partial<SchoolSettings>) => {
    get().updateSchoolSettings(DEFAULT_SCHOOL_SLUG, updates);
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ settings: JSON.parse(stored) });
      } else {
        // Initialize with default settings
        set({
          settings: {
            [DEFAULT_SCHOOL_SLUG]: {
              schoolSlug: DEFAULT_SCHOOL_SLUG,
              weightsEnabled: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        });
      }
      
      // Load from Supabase asynchronously (ONCE)
      if (!isLoadingFromSupabase) {
        isLoadingFromSupabase = true;
        loadSupabaseSettings()
          .then((settings) => {
            if (settings) {
              set((state) => ({
                settings: {
                  ...state.settings,
                  [DEFAULT_SCHOOL_SLUG]: settings,
                },
              }));
              get().saveToStorage();
            }
          })
          .catch(console.error)
          .finally(() => {
            isLoadingFromSupabase = false;
          });
      }
    } catch (error) {
      console.error('Error loading school settings:', error);
    }
  },

  saveToStorage: () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(get().settings));
    } catch (error) {
      console.error('Error saving school settings:', error);
    }
  },
}));

// Async helper to load from Supabase
async function loadSupabaseSettings(): Promise<SchoolSettings | null> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'use_activity_weights')
    .single();

  if (error) {
    // PGRST116 = not found (ok, usar default)
    // PGRST301 = RLS block (fallback para default)
    if (error.code !== 'PGRST116' && error.code !== 'PGRST301') {
      console.error('Error loading settings from Supabase:', error);
    }
    return null; // Fallback para weightsEnabled: true
  }

  if (!data) return null;

  const value = data.value as { enabled?: boolean };
  return {
    schoolSlug: DEFAULT_SCHOOL_SLUG,
    weightsEnabled: value?.enabled ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Async helper to update Supabase
async function updateSupabaseSettings(updates: Partial<SchoolSettings>): Promise<void> {
  if (updates.weightsEnabled !== undefined) {
    const { error } = await supabase
      .from('school_settings')
      .upsert(
        { key: 'use_activity_weights', value: { enabled: updates.weightsEnabled } },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Error updating settings in Supabase:', error);
      throw error;
    }
  }
}
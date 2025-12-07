import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserSettings {
  rememberEmail: boolean;
  lastEmail: string;
  reduceMotion: boolean;
  calendarDensity: 'compact' | 'comfortable' | 'spacious';
  currentTheme: 
    | 'dark-neon' 
    | 'dark-serene' 
    | 'light' 
    | 'high-contrast'
    | 'theme_ocean_breeze'
    | 'theme_sunset_gradient'
    | 'theme_forest_mystic'
    | 'theme_midnight_aurora'
    | 'theme_volcanic_fire'
    | 'theme_sakura_dreams'
    | 'theme_cyberpunk_city';
  nexusPreferences: {
    defaultFocusDuration: number;
    enableMorningWindow: boolean;
    enableAfternoonWindow: boolean;
    enableEveningWindow: boolean;
    enableMicroBreaks: boolean;
  };
}

interface UserSettingsStore extends UserSettings {
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  updateNexusPreference: <K extends keyof UserSettings['nexusPreferences']>(
    key: K, 
    value: UserSettings['nexusPreferences'][K]
  ) => void;
  setLastEmail: (email: string) => void;
}

const defaultSettings: UserSettings = {
  rememberEmail: false,
  lastEmail: '',
  reduceMotion: false,
  calendarDensity: 'comfortable',
  currentTheme: 'dark-neon',
  nexusPreferences: {
    defaultFocusDuration: 25,
    enableMorningWindow: true,
    enableAfternoonWindow: true,
    enableEveningWindow: false,
    enableMicroBreaks: true,
  },
};

export const useUserSettingsStore = create<UserSettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      
      updateSetting: (key, value) => {
        set({ [key]: value });
        
        // Apply settings immediately
        if (key === 'reduceMotion') {
          const root = document.documentElement;
          if (value) {
            root.style.setProperty('--motion-duration', '0.01ms');
            root.classList.add('reduce-motion');
          } else {
            root.style.removeProperty('--motion-duration');
            root.classList.remove('reduce-motion');
          }
        }
      },
      
      updateNexusPreference: (key, value) => {
        const currentPrefs = get().nexusPreferences;
        set({
          nexusPreferences: {
            ...currentPrefs,
            [key]: value,
          },
        });
      },
      
      setLastEmail: (email) => {
        set({ lastEmail: email });
      },
    }),
    {
      name: 'user-settings-storage',
      version: 1,
      onRehydrateStorage: () => (state) => {
        // Apply theme after localStorage hydration
        if (state?.currentTheme) {
          const root = document.documentElement;
          const theme = state.currentTheme;
          
          // Clear previous classes
          root.removeAttribute('data-theme');
          root.classList.remove('dark');
          
          // Don't apply premium themes here (loaded from database in AppLayout)
          if (theme.startsWith('theme_')) {
            root.classList.add('dark');
            return;
          }
          
          // Apply free themes
          if (theme === 'dark-neon') {
            root.classList.add('dark');
          } else {
            root.setAttribute('data-theme', theme);
            const darkThemes = ['dark-serene', 'high-contrast'];
            if (darkThemes.includes(theme)) {
              root.classList.add('dark');
            }
          }
        }
      },
    }
  )
);

// Initialize motion preferences on load
if (typeof window !== 'undefined') {
  const settings = useUserSettingsStore.getState();
  if (settings.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--motion-duration', '0.01ms');
    document.documentElement.classList.add('reduce-motion');
  }
}
import { useEffect } from 'react';
import { useUserSettingsStore } from '@/stores/user-settings-store';

export type ThemeOption = 
  | 'dark-neon' 
  | 'dark-serene' 
  | 'light' 
  | 'high-contrast'
  | 'theme_cyberpunk_neon'
  | 'theme_ocean_breeze'
  | 'theme_sunset_gradient'
  | 'theme_forest_mystic'
  | 'theme_midnight_aurora'
  | 'theme_volcanic_fire'
  | 'theme_sakura_dreams'
  | 'theme_cyberpunk_city';

export interface ThemeConfig {
  value: ThemeOption;
  label: string;
  icon: string;
  description: string;
  preview: {
    bg: string;
    primary: string;
    text: string;
  };
}

export const THEME_OPTIONS: ThemeConfig[] = [
  {
    value: 'dark-neon',
    label: 'Escuro Neon',
    icon: '🌙',
    description: 'High-tech violeta/ciano',
    preview: {
      bg: 'hsl(220, 27%, 4%)',
      primary: 'hsl(264, 89%, 58%)',
      text: 'hsl(210, 40%, 98%)',
    },
  },
  {
    value: 'dark-serene',
    label: 'Escuro Sereno',
    icon: '🌊',
    description: 'Tons azulados suaves',
    preview: {
      bg: 'hsl(222, 47%, 11%)',
      primary: 'hsl(217, 91%, 60%)',
      text: 'hsl(210, 40%, 96%)',
    },
  },
  {
    value: 'light',
    label: 'Claro Profissional',
    icon: '☀️',
    description: 'Tema claro tradicional',
    preview: {
      bg: 'hsl(0, 0%, 100%)',
      primary: 'hsl(262, 83%, 58%)',
      text: 'hsl(222, 47%, 11%)',
    },
  },
  {
    value: 'high-contrast',
    label: 'Alto Contraste',
    icon: '⚡',
    description: 'Máxima acessibilidade',
    preview: {
      bg: 'hsl(0, 0%, 0%)',
      primary: 'hsl(48, 96%, 53%)',
      text: 'hsl(0, 0%, 100%)',
    },
  },
];

export function useTheme() {
  const { currentTheme, updateSetting } = useUserSettingsStore();

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = (theme: ThemeOption) => {
    updateSetting('currentTheme', theme);
    applyTheme(theme);
  };

  return {
    currentTheme,
    setTheme,
    themes: THEME_OPTIONS,
  };
}

function applyTheme(theme: ThemeOption) {
  const root = document.documentElement;
  
  // Remove all theme classes
  root.removeAttribute('data-theme');
  root.classList.remove('dark');
  
  // Apply new theme
  if (theme === 'dark-neon') {
    // Default dark theme - use existing CSS variables
    root.classList.add('dark');
  } else {
    root.setAttribute('data-theme', theme);
    // Add dark class for all dark themes (including all premium themes)
    const darkThemes = [
      'dark-serene', 
      'high-contrast',
      'theme_cyberpunk_neon',
      'theme_ocean_breeze',
      'theme_sunset_gradient',
      'theme_forest_mystic',
      'theme_midnight_aurora',
      'theme_volcanic_fire',
      'theme_sakura_dreams',
      'theme_cyberpunk_city'
    ];
    if (darkThemes.includes(theme)) {
      root.classList.add('dark');
    }
  }
}

/**
 * Apply a premium theme by its identifier
 * Used by the gamification system when equipping premium themes
 */
export function applyPremiumTheme(identifier: string) {
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  root.classList.remove('dark');
  root.setAttribute('data-theme', identifier);
  root.classList.add('dark'); // All premium themes are dark
  
  // Do NOT save to localStorage - premium themes are per-user from database only
  // This prevents theme leakage between different users on the same browser
}

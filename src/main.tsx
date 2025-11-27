import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useSchoolSettingsStore } from '@/stores/school-settings-store';
import { useUserSettingsStore } from '@/stores/user-settings-store';

// Inicializar configurações da escola no carregamento da aplicação
const initializeSchoolSettings = () => {
  const store = useSchoolSettingsStore.getState();
  store.loadFromStorage();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🏫 Configurações da escola carregadas');
  }
};

// Inicializar apenas temas gratuitos do localStorage
const initializeTheme = () => {
  const { currentTheme } = useUserSettingsStore.getState();
  const root = document.documentElement;
  
  // Premium themes should NOT be loaded from localStorage to prevent user leakage
  // They will be loaded from database after authentication in AppLayout
  const isPremiumTheme = currentTheme.startsWith('theme_');
  
  if (isPremiumTheme) {
    // If localStorage has premium theme from previous session, reset to default
    console.log('[initializeTheme] Premium theme detected in localStorage, resetting to default');
    root.classList.add('dark'); // Default dark-neon theme
    useUserSettingsStore.getState().updateSetting('currentTheme', 'dark-neon');
    return;
  }
  
  // Apply free themes normally
  if (currentTheme === 'dark-neon') {
    root.classList.add('dark');
  } else {
    root.setAttribute('data-theme', currentTheme);
    
    // Lista de temas escuros gratuitos
    const darkThemes = ['dark-serene', 'high-contrast'];
    
    if (darkThemes.includes(currentTheme)) {
      root.classList.add('dark');
    }
  }
};

// Inicializar na primeira execução
initializeSchoolSettings();
initializeTheme();

const container = document.getElementById("root");
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

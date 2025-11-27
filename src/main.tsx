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

// Inicializar tema do usuário (inclui temas premium)
const initializeTheme = () => {
  const { currentTheme } = useUserSettingsStore.getState();
  const root = document.documentElement;
  
  if (currentTheme === 'dark-neon') {
    root.classList.add('dark');
  } else {
    root.setAttribute('data-theme', currentTheme);
    
    // Lista de todos os temas escuros (incluindo premium)
    const darkThemes = [
      'dark-serene',
      'high-contrast',
      'theme_cyberpunk_neon',
      'theme_ocean_breeze',
      'theme_sunset_gradient',
      'theme_forest_mystic',
      'theme_midnight_aurora',
      'theme_volcanic_fire'
    ];
    
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

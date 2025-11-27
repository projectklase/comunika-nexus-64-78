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

// Inicializar tema do usuário
const initializeTheme = () => {
  const { currentTheme } = useUserSettingsStore.getState();
  const root = document.documentElement;
  
  if (currentTheme === 'dark-neon') {
    root.classList.add('dark');
  } else {
    root.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark-serene' || currentTheme === 'high-contrast') {
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

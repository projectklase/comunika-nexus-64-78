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

// Inicializar tema default enquanto aguarda hydration do Zustand
const initializeTheme = () => {
  const root = document.documentElement;
  root.classList.add('dark'); // Default: dark-neon
  // onRehydrateStorage callback will apply persisted theme after hydration
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

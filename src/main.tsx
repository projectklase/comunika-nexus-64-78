import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useSchoolSettingsStore } from '@/stores/school-settings-store';

// Inicializar configurações da escola no carregamento da aplicação
const initializeSchoolSettings = () => {
  const store = useSchoolSettingsStore.getState();
  store.loadFromStorage();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🏫 Configurações da escola carregadas');
  }
};

// Inicializar na primeira execução
initializeSchoolSettings();

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

import { useEffect, useState } from 'react';
import { useSchoolSettingsStore } from '@/stores/school-settings-store';

/**
 * Hook para verificar se pesos estão habilitados na escola atual
 * Reativo às mudanças de configuração
 */
export function useWeightsEnabled() {
  const { getCurrentSchoolSettings, loadFromStorage } = useSchoolSettingsStore();
  const [weightsEnabled, setWeightsEnabled] = useState(true);

  useEffect(() => {
    // Carregar configurações do storage na inicialização
    loadFromStorage();
    
    const settings = getCurrentSchoolSettings();
    if (settings) {
      setWeightsEnabled(settings.weightsEnabled);
    }
  }, [getCurrentSchoolSettings, loadFromStorage]);

  // Escutar mudanças no store
  useEffect(() => {
    const unsubscribe = useSchoolSettingsStore.subscribe((state) => {
      const settings = state.getCurrentSchoolSettings();
      if (settings) {
        setWeightsEnabled(settings.weightsEnabled);
      }
    });

    return unsubscribe;
  }, []);

  return weightsEnabled;
}
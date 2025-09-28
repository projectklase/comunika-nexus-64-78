import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SchoolSetting {
  key: string;
  value: any;
  description?: string | null;
  updated_at: string;
}

export function useSchoolSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('school_settings')
        .select('*');

      if (error) throw error;
      
      // Convert array to object for easier access
      const settingsObj: Record<string, any> = {};
      data?.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      
      setSettings(settingsObj);
    } catch (error) {
      console.error('Error loading school settings:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações",
        description: "Não foi possível carregar as configurações da escola."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any, description?: string) => {
    try {
      const { error } = await supabase
        .from('school_settings')
        .upsert({
          key,
          value,
          description,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        [key]: value
      }));

      toast({
        title: "Configuração atualizada",
        description: "A configuração foi atualizada com sucesso."
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar configuração",
        description: "Não foi possível atualizar a configuração."
      });
      throw error;
    }
  };

  const getSetting = (key: string, defaultValue?: any) => {
    return settings[key] ?? defaultValue;
  };

  // Specific helper for weights setting
  const getWeightsEnabled = () => {
    const weightsSetting = getSetting('use_activity_weights', { enabled: false });
    return weightsSetting?.enabled === true;
  };

  const setWeightsEnabled = async (enabled: boolean) => {
    await updateSetting(
      'use_activity_weights', 
      { enabled }, 
      'Configuração para habilitar/desabilitar peso nas atividades'
    );
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    isLoading,
    getSetting,
    updateSetting,
    getWeightsEnabled,
    setWeightsEnabled,
    refetch: loadSettings
  };
}
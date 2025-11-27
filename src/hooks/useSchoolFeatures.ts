import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SchoolFeature {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: string;
  category: string;
}

const AVAILABLE_FEATURES: Omit<SchoolFeature, 'enabled'>[] = [
  {
    key: 'koins_enabled',
    label: 'Sistema de Koins',
    description: 'Alunos ganham e gastam Koins em recompensas e loja virtual',
    icon: '🪙',
    category: 'Gamificação'
  },
  {
    key: 'challenges_enabled',
    label: 'Desafios',
    description: 'Sistema de desafios diários e semanais para engajamento',
    icon: '🎯',
    category: 'Gamificação'
  },
  {
    key: 'rankings_enabled',
    label: 'Rankings',
    description: 'Exibe ranking de XP, Koins e streak entre alunos da escola',
    icon: '🏆',
    category: 'Gamificação'
  }
];

export function useSchoolFeatures(schoolId?: string) {
  const [features, setFeatures] = useState<SchoolFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadFeatures = useCallback(async () => {
    if (!schoolId) {
      setFeatures([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load all settings for this school
      const { data: settings, error } = await supabase
        .from('school_settings')
        .select('key, value')
        .eq('school_id', schoolId);

      if (error) throw error;

      // Map settings to features
      const settingsMap = new Map(settings?.map(s => [s.key, s.value]) || []);

      const mappedFeatures = AVAILABLE_FEATURES.map(feature => {
        const value = settingsMap.get(feature.key);
        const enabled = value && typeof value === 'object' && 'enabled' in value 
          ? (value as any).enabled === true 
          : false;
        
        return {
          ...feature,
          enabled
        };
      });

      setFeatures(mappedFeatures);
    } catch (error) {
      console.error('[useSchoolFeatures] Error loading features:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar funcionalidades",
        description: "Não foi possível carregar as configurações."
      });
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, toast]);

  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    if (!schoolId) return;

    try {
      const { error } = await supabase
        .from('school_settings')
        .upsert([{
          key: featureKey,
          school_id: schoolId,
          value: { enabled },
          description: AVAILABLE_FEATURES.find(f => f.key === featureKey)?.description,
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Update local state
      setFeatures(prev => prev.map(f => 
        f.key === featureKey ? { ...f, enabled } : f
      ));

      toast({
        title: enabled ? "Funcionalidade ativada" : "Funcionalidade desativada",
        description: `${AVAILABLE_FEATURES.find(f => f.key === featureKey)?.label} foi ${enabled ? 'ativada' : 'desativada'}.`
      });
    } catch (error) {
      console.error('[useSchoolFeatures] Error toggling feature:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar funcionalidade",
        description: "Não foi possível alterar a configuração."
      });
      throw error;
    }
  };

  const getFeatureStatus = useCallback((featureKey: string): boolean => {
    const feature = features.find(f => f.key === featureKey);
    return feature?.enabled || false;
  }, [features]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  return {
    features,
    isLoading,
    toggleFeature,
    getFeatureStatus,
    refetch: loadFeatures
  };
}

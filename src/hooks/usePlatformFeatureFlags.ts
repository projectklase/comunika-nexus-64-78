import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformFeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export function usePlatformFeatureFlags() {
  const [flags, setFlags] = useState<PlatformFeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFlags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('key');

      if (error) throw error;
      setFlags(data || []);
    } catch (err) {
      console.error('Error loading feature flags:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateFlag = useCallback(async (key: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ 
          enabled, 
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('key', key);

      if (error) throw error;
      
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled } : f));
      return true;
    } catch (err) {
      console.error('Error updating feature flag:', err);
      return false;
    }
  }, []);

  const getFlag = useCallback((key: string): boolean => {
    const flag = flags.find(f => f.key === key);
    return flag?.enabled ?? false;
  }, [flags]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  return {
    flags,
    isLoading,
    updateFlag,
    getFlag,
    refetch: loadFlags,
  };
}

// Hook simplificado para checar um flag específico (uso no Login)
export function useFeatureFlag(key: string) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkFlag() {
      try {
        const { data, error } = await supabase
          .from('feature_flags')
          .select('enabled')
          .eq('key', key)
          .single();

        if (error) throw error;
        setEnabled(data?.enabled ?? false);
      } catch (err) {
        console.error(`Error checking feature flag ${key}:`, err);
        setEnabled(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkFlag();
  }, [key]);

  return { enabled, isLoading };
}

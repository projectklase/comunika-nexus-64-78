import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  config: any;
  updated_at: string;
  updated_by: string | null;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlags();

    // Subscribe to changes
    const subscription = supabase
      .channel('feature_flags_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_flags'
        },
        () => {
          loadFlags();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadFlags() {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*');

      if (error) throw error;

      const flagsMap: Record<string, FeatureFlag> = {};
      data?.forEach(flag => {
        flagsMap[flag.key] = flag;
      });

      setFlags(flagsMap);
    } catch (error) {
      console.error('[useFeatureFlags] Error loading flags:', error);
    } finally {
      setLoading(false);
    }
  }

  const isEnabled = (key: string): boolean => {
    return flags[key]?.enabled || false;
  };

  const getConfig = (key: string): Record<string, any> => {
    return flags[key]?.config || {};
  };

  const updateFlag = async (key: string, updates: Partial<FeatureFlag>) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update(updates)
        .eq('key', key);

      if (error) throw error;
    } catch (error) {
      console.error('[useFeatureFlags] Error updating flag:', error);
      throw error;
    }
  };

  return {
    flags,
    loading,
    isEnabled,
    getConfig,
    updateFlag
  };
}

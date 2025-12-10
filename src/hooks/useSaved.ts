import { useState, useEffect, useRef } from 'react';
import { savedStore } from '@/stores/saved-store';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useSaved() {
  const [_, forceUpdate] = useState({});
  const { user } = useAuth();
  const hasLoadedFromDb = useRef(false);

  // CORREÇÃO: Carregar posts salvos do banco de dados quando usuário faz login
  useEffect(() => {
    if (user?.id && !hasLoadedFromDb.current) {
      hasLoadedFromDb.current = true;
      
      supabase
        .from('post_saves')
        .select('post_id')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (!error && data) {
            data.forEach(save => {
              savedStore.save(save.post_id);
            });
            forceUpdate({});
          }
        });
    }
    
    // Reset flag when user changes (logout/login)
    if (!user?.id) {
      hasLoadedFromDb.current = false;
    }
  }, [user?.id]);

  const save = async (postId: string) => {
    savedStore.save(postId);
    forceUpdate({});
    
    // Sincronizar com banco de dados
    if (user?.id) {
      await supabase
        .from('post_saves')
        .upsert({ user_id: user.id, post_id: postId }, { onConflict: 'user_id,post_id' })
        .then(({ error }) => {
          if (error) console.error('[useSaved] Error saving to DB:', error);
        });
    }
  };

  const unsave = async (postId: string) => {
    savedStore.unsave(postId);
    forceUpdate({});
    
    // Sincronizar com banco de dados
    if (user?.id) {
      await supabase
        .from('post_saves')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .then(({ error }) => {
          if (error) console.error('[useSaved] Error unsaving from DB:', error);
        });
    }
  };

  const isSaved = (postId: string): boolean => {
    return savedStore.isSaved(postId);
  };

  const toggleSave = (postId: string) => {
    if (isSaved(postId)) {
      unsave(postId);
    } else {
      save(postId);
    }
  };

  return {
    save,
    unsave,
    isSaved,
    toggleSave,
    savedCount: savedStore.getSavedCount(),
    savedIds: savedStore.getSavedIds()
  };
}

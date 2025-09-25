import { useState } from 'react';
import { savedStore } from '@/stores/saved-store';

export function useSaved() {
  const [_, forceUpdate] = useState({});

  const save = (postId: string) => {
    savedStore.save(postId);
    forceUpdate({}); // Force re-render
  };

  const unsave = (postId: string) => {
    savedStore.unsave(postId);
    forceUpdate({}); // Force re-render
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
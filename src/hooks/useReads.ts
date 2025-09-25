import { useState, useEffect } from 'react';
import { readStore } from '@/stores/read-store';
import { usePostReads } from '@/stores/post-reads.store';
import { useAuth } from '@/contexts/AuthContext';

export function useReads() {
  const [_, forceUpdate] = useState({});
  const { recordPostRead } = usePostReads();
  const { user } = useAuth();

  const markAsRead = (postId: string) => {
    readStore.markAsRead(postId);
    
    // Also record detailed read for insights
    if (user) {
      recordPostRead(postId, user, user.classId);
    }
    
    forceUpdate({}); // Force re-render
  };

  const isRead = (postId: string): boolean => {
    return readStore.isRead(postId);
  };

  const unmarkAsRead = (postId: string) => {
    readStore.unmarkAsRead(postId);
    forceUpdate({}); // Force re-render
  };

  return {
    markAsRead,
    isRead,
    unmarkAsRead,
    readCount: readStore.getReadCount()
  };
}
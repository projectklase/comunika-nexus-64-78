import { useState, useMemo } from 'react';
import { Post, ActivityType, PostStatus } from '@/types/post';
import { isToday, isBefore, isAfter, startOfDay } from 'date-fns';

interface ActivityFilters {
  type?: ActivityType;
  status?: PostStatus;
  deadline?: 'upcoming' | 'overdue' | 'today';
}

export function useActivityFilters(posts: Post[]) {
  const [filters, setFilters] = useState<ActivityFilters>({});

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Only filter activity posts
      if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) {
        return false;
      }

      // Type filter
      if (filters.type && post.type !== filters.type) {
        return false;
      }

      // Status filter
      if (filters.status && post.status !== filters.status) {
        return false;
      }

      // Deadline filter
      if (filters.deadline && post.dueAt) {
        const dueDate = new Date(post.dueAt);
        const today = startOfDay(new Date());
        const dueDateDay = startOfDay(dueDate);

        switch (filters.deadline) {
          case 'today':
            if (!isToday(dueDate)) return false;
            break;
          case 'upcoming':
            if (!isAfter(dueDateDay, today)) return false;
            break;
          case 'overdue':
            if (!isBefore(dueDateDay, today)) return false;
            break;
        }
      }

      return true;
    });
  }, [posts, filters]);

  const setTypeFilter = (type?: ActivityType) => {
    setFilters(prev => ({ ...prev, type }));
  };

  const setStatusFilter = (status?: PostStatus) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const setDeadlineFilter = (deadline?: 'upcoming' | 'overdue' | 'today') => {
    setFilters(prev => ({ ...prev, deadline }));
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  return {
    filteredPosts,
    filters,
    setTypeFilter,
    setStatusFilter,
    setDeadlineFilter,
    clearAllFilters
  };
}
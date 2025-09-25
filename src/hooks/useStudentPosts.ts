import { useMemo } from 'react';
import { format, startOfDay, endOfDay, isToday, isWithinInterval, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { usePosts } from './usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentClasses } from '@/utils/student-helpers';
import { Post } from '@/types/post';

export interface StudentPostsFilter {
  timeRange?: 'today' | 'tomorrow' | 'week' | 'month' | 'all';
  types?: string[];
  classId?: string;
  includeRead?: boolean;
}

/**
 * Hook especializado para posts relevantes ao aluno
 * Filtra por turmas do aluno e aplica RBAC correto
 */
export function useStudentPosts(filter: StudentPostsFilter = {}) {
  const { user } = useAuth();
  const allPosts = usePosts({ status: 'PUBLISHED' });

  const filteredPosts = useMemo(() => {
    if (!user || user.role !== 'aluno') return [];

    // Get student classes
    const studentClasses = getStudentClasses(user.id);
    const studentClassIds = studentClasses.map(c => c.id);

    let posts = allPosts.filter(post => {
      // RBAC: Only published posts for students
      if (post.status !== 'PUBLISHED') return false;

      // Filter by student's classes or global posts
      if (post.audience === 'CLASS') {
        const postClasses = post.classIds || (post.classId ? [post.classId] : []);
        return postClasses.some(classId => studentClassIds.includes(classId));
      }
      
      // Global posts are visible to all
      return post.audience === 'GLOBAL';
    });

    // Apply type filter
    if (filter.types && filter.types.length > 0) {
      posts = posts.filter(post => filter.types!.includes(post.type));
    }

    // Apply class filter
    if (filter.classId && filter.classId !== 'ALL_CLASSES') {
      posts = posts.filter(post => {
        if (post.audience === 'GLOBAL') return false;
        const postClasses = post.classIds || (post.classId ? [post.classId] : []);
        return postClasses.includes(filter.classId!);
      });
    }

    // Apply time range filter
    if (filter.timeRange && filter.timeRange !== 'all') {
      const now = new Date();
      posts = posts.filter(post => {
        const dateToCheck = post.dueAt || post.eventStartAt;
        if (!dateToCheck) return false;

        const postDate = new Date(dateToCheck);
        
        switch (filter.timeRange) {
          case 'today':
            return isToday(postDate);
          case 'tomorrow':
            return isToday(addDays(postDate, -1));
          case 'week':
            return isWithinInterval(postDate, {
              start: startOfWeek(now, { weekStartsOn: 1 }),
              end: endOfWeek(now, { weekStartsOn: 1 })
            });
          case 'month':
            return isWithinInterval(postDate, {
              start: startOfDay(now),
              end: endOfDay(addDays(now, 30))
            });
          default:
            return true;
        }
      });
    }

    // Sort by relevance: urgent activities first, then events, then by date
    posts.sort((a, b) => {
      const priorityOrder = { 
        PROVA: 4, 
        TRABALHO: 3, 
        ATIVIDADE: 3, 
        EVENTO: 2, 
        COMUNICADO: 1, 
        AVISO: 1 
      };
      
      const aPriority = priorityOrder[a.type] || 0;
      const bPriority = priorityOrder[b.type] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Within same priority, sort by date
      const aDate = a.dueAt || a.eventStartAt || a.createdAt;
      const bDate = b.dueAt || b.eventStartAt || b.createdAt;
      
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

    return posts;
  }, [allPosts, user, filter]);

  // Additional computed data
  const todayPosts = useMemo(() => {
    return filteredPosts.filter(post => {
      const dateToCheck = post.dueAt || post.eventStartAt;
      if (!dateToCheck) return false;
      return isToday(new Date(dateToCheck));
    });
  }, [filteredPosts]);

  const upcomingPosts = useMemo(() => {
    const now = new Date();
    const next48h = addDays(now, 2);
    
    return filteredPosts.filter(post => {
      const dateToCheck = post.dueAt || post.eventStartAt;
      if (!dateToCheck) return false;
      
      const postDate = new Date(dateToCheck);
      return isWithinInterval(postDate, {
        start: now,
        end: next48h
      });
    });
  }, [filteredPosts]);

  return {
    posts: filteredPosts,
    todayPosts,
    upcomingPosts,
    totalPosts: filteredPosts.length,
    activitiesCount: filteredPosts.filter(p => ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(p.type)).length,
    eventsCount: filteredPosts.filter(p => p.type === 'EVENTO').length,
    noticesCount: filteredPosts.filter(p => ['AVISO', 'COMUNICADO'].includes(p.type)).length
  };
}
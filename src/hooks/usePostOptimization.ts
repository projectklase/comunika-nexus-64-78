import { useMemo } from 'react';
import { Post } from '@/types/post';
import { useAuth } from '@/contexts/AuthContext';

interface PostGroup {
  date: string;
  posts: Post[];
  eventCount: number;
  activityCount: number;
  deadlineCount: number;
}

interface UserProfile {
  id: string;
  role: 'aluno' | 'professor' | 'secretaria';
  preferences?: {
    hideRead?: boolean;
    sortBy?: 'relevant' | 'recent';
  };
}

export function usePostGrouping(posts: Post[], profile: UserProfile) {
  return useMemo(() => {
    // Group posts by date for better organization
    const groupedByDate = posts.reduce((groups, post) => {
      const dateKey = new Date(post.createdAt).toDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          posts: [],
          eventCount: 0,
          activityCount: 0,
          deadlineCount: 0
        };
      }
      
      groups[dateKey].posts.push(post);
      
      // Count different types
      if (post.type === 'EVENTO') {
        groups[dateKey].eventCount++;
      } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) {
        groups[dateKey].activityCount++;
        if (post.dueAt && new Date(post.dueAt) <= new Date()) {
          groups[dateKey].deadlineCount++;
        }
      }
      
      return groups;
    }, {} as Record<string, PostGroup>);
    
    // Convert to array and sort by date (most recent first)
    const sortedGroups = Object.values(groupedByDate).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Apply user-specific sorting within each group
    sortedGroups.forEach(group => {
      if (profile.preferences?.sortBy === 'recent') {
        group.posts.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else {
        // 'relevant' sorting - prioritize activities, then events, then by date
        group.posts.sort((a, b) => {
          const priorityOrder = { 
            ATIVIDADE: 3, 
            TRABALHO: 3, 
            PROVA: 3, 
            EVENTO: 2, 
            COMUNICADO: 1, 
            AVISO: 0 
          };
          
          const aPriority = priorityOrder[a.type] || 0;
          const bPriority = priorityOrder[b.type] || 0;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          
          // Same priority, sort by date
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
    });
    
    return sortedGroups;
  }, [posts, profile.preferences?.sortBy]);
}

export function usePostMetrics(posts: Post[]) {
  return useMemo(() => {
    const metrics = {
      total: posts.length,
      byType: {
        AVISO: 0,
        COMUNICADO: 0,
        EVENTO: 0,
        ATIVIDADE: 0,
        TRABALHO: 0,
        PROVA: 0
      },
      overdue: 0,
      thisWeek: 0,
      thisMonth: 0
    };
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    posts.forEach(post => {
      // Count by type
      if (post.type in metrics.byType) {
        metrics.byType[post.type as keyof typeof metrics.byType]++;
      }
      
      // Count overdue activities
      if (post.dueAt && new Date(post.dueAt) < now && 
          ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) {
        metrics.overdue++;
      }
      
      // Count by time periods
      const postDate = new Date(post.createdAt);
      if (postDate >= weekAgo) {
        metrics.thisWeek++;
      }
      if (postDate >= monthAgo) {
        metrics.thisMonth++;
      }
    });
    
    return metrics;
  }, [posts]);
}

export function useFilteredPosts(
  posts: Post[], 
  filters: { hideRead?: boolean; classIds?: string[]; types?: string[] },
  readIds: Set<string> = new Set()
) {
  return useMemo(() => {
    return posts.filter(post => {
      // Hide read posts if enabled
      if (filters.hideRead && readIds.has(post.id)) {
        return false;
      }
      
      // Filter by class IDs
      if (filters.classIds && filters.classIds.length > 0) {
        const postClassIds = post.classIds || (post.classId ? [post.classId] : []);
        if (!postClassIds.some(id => filters.classIds!.includes(id))) {
          return false;
        }
      }
      
      // Filter by post types
      if (filters.types && filters.types.length > 0) {
        if (!filters.types.includes(post.type)) {
          return false;
        }
      }
      
      return true;
    });
  }, [posts, filters.hideRead, filters.classIds, filters.types, readIds]);
}
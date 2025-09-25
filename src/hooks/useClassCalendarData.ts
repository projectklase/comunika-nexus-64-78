import { useMemo } from 'react';
import { usePosts } from './usePosts';
import { Post, ActivityType } from '@/types/post';
import { isWithinInterval, parseISO, isBefore } from 'date-fns';
import { getActivityTypeFromPost, isActivityPost } from '@/utils/activity-helpers';

export interface ClassCalendarEvent {
  id: string;
  post: Post;
  dueDate: Date;
  type: ActivityType;
  title: string;
  isOverdue: boolean;
  isScheduled: boolean;
}

export interface ClassCalendarMetrics {
  total: number;
  atividade: number;
  trabalho: number;
  prova: number;
  overdue: number;
  scheduled: number;
}

interface UseClassCalendarDataOptions {
  showScheduled?: boolean;
  typeFilters?: ActivityType[];
  statusFilters?: string[];
}

export function useClassCalendarData(
  classId: string, 
  startDate: Date, 
  endDate: Date, 
  options: UseClassCalendarDataOptions = {}
) {
  const { showScheduled = false, typeFilters = [], statusFilters = [] } = options;
  
  // Get all activity posts for this class
  const posts = usePosts({ 
    type: undefined // We'll filter in memo
  });

  const { events, metrics } = useMemo(() => {
    const now = new Date();
    const calendarEvents: ClassCalendarEvent[] = [];
    const metricsData: ClassCalendarMetrics = {
      total: 0,
      atividade: 0,
      trabalho: 0,
      prova: 0,
      overdue: 0,
      scheduled: 0
    };

    posts.forEach(post => {
      // Only process activity posts for this class
      if (!isActivityPost(post) || !post.dueAt) return;
      
      // Check if post belongs to this class
      const belongsToClass = post.classIds?.includes(classId) || post.classId === classId;
      if (!belongsToClass) return;

      const activityType = getActivityTypeFromPost(post);
      if (!activityType) return;

      const dueDate = parseISO(post.dueAt);
      const isScheduled = post.status === 'SCHEDULED';
      const isOverdue = isBefore(dueDate, now);

      // Filter by publication status
      if (isScheduled && !showScheduled) return;
      if (post.status !== 'PUBLISHED' && post.status !== 'SCHEDULED') return;

      // Check if due date is within our range
      if (!isWithinInterval(dueDate, { start: startDate, end: endDate })) return;

      // Apply type filters
      if (typeFilters.length > 0 && !typeFilters.includes(activityType)) return;

      // Apply status filters (for future implementation)
      if (statusFilters.length > 0) {
        // This would need delivery data to implement properly
        // For now, we'll skip this filtering
      }

      const event: ClassCalendarEvent = {
        id: post.id,
        post,
        dueDate,
        type: activityType,
        title: post.title,
        isOverdue,
        isScheduled
      };

      calendarEvents.push(event);

      // Update metrics
      metricsData.total++;
      metricsData[activityType]++;
      if (isOverdue) metricsData.overdue++;
      if (isScheduled) metricsData.scheduled++;
    });

    return { events: calendarEvents, metrics: metricsData };
  }, [posts, classId, startDate, endDate, showScheduled, typeFilters, statusFilters]);

  return { events, metrics };
}
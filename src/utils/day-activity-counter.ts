import { isSameDay } from 'date-fns';
import { Post } from '@/types/post';

/**
 * SINGLE SOURCE OF TRUTH: Get activities for a specific day for students
 * This function is used for both pill rendering, counting, and DaySummarySheet
 */
export function getDayActivitiesForStudent(
  date: Date,
  posts: Post[],
  activeFilters: { events: boolean; deadlines: boolean }
): Post[] {
  if (!activeFilters.deadlines) return [];

  return posts
    .filter(post => {
      // Only count published activities visible to students
      if (post.status !== 'PUBLISHED') return false;
      
      // Only count activity types
      if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return false;
      
      // Must have a due date
      if (!post.dueAt) return false;
      
      // Check if due date matches the target date (local day)
      const dueDate = new Date(post.dueAt);
      return isSameDay(dueDate, date);
    })
    .sort((a, b) => {
      // Sort by due time ascending
      const timeA = new Date(a.dueAt!).getTime();
      const timeB = new Date(b.dueAt!).getTime();
      return timeA - timeB;
    });
}

/**
 * Count activities (ATIVIDADE, TRABALHO, PROVA) for a specific day
 * Uses the same source as getDayActivitiesForStudent
 */
export function countDayActivities(
  date: Date, 
  posts: Post[], 
  activeFilters: { events: boolean; deadlines: boolean },
  role: string = 'aluno'
): number {
  return getDayActivitiesForStudent(date, posts, activeFilters).length;
}

/**
 * DEPRECATED: Use getDayActivitiesForStudent instead for consistency
 * Get activities for a specific day, filtered and sorted
 */
export function getDayActivities(
  date: Date,
  posts: Post[],
  activeFilters: { events: boolean; deadlines: boolean }
): Post[] {
  // Redirect to the unified function
  return getDayActivitiesForStudent(date, posts, activeFilters);
}

/**
 * Filter activities by type
 */
export function filterActivitiesByType(
  activities: Post[], 
  activeTypes: string[]
): Post[] {
  if (activeTypes.includes('ALL')) return activities;
  
  return activities.filter(activity => 
    activeTypes.includes(activity.type)
  );
}
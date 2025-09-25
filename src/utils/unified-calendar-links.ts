import { format, isValid } from 'date-fns';
import { ROUTES } from '@/constants/routes';
import { Post } from '@/types/post';
import { parseYmdLocal } from '@/lib/date-helpers';

export type UserRole = 'aluno' | 'professor' | 'secretaria';
export type FocusType = 'post' | 'holiday';

export interface CalendarLinkParams {
  role: UserRole;
  date: string | Date;
  focusId?: string;
  focusType?: FocusType;
  classId?: string;
}

/**
 * Unified Calendar Link Builder
 * Creates consistent links for all calendar navigation scenarios
 */
export class UnifiedCalendarLinks {
  
  /**
   * Build calendar link with unified parameters
   */
  static buildCalendarLink({
    role,
    date,
    focusId,
    focusType,
    classId
  }: CalendarLinkParams): string {
    try {
      const baseRoute = this.getCalendarRoute(role);
      let targetDate: Date;

      if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const parsed = parseYmdLocal(date);
          if (!parsed) {
            console.warn('Invalid YMD date provided to calendar link builder:', date);
            return baseRoute;
          }
          targetDate = parsed;
        } else {
          targetDate = new Date(date);
        }
      } else {
        targetDate = date;
      }
      
      if (!isValid(targetDate)) {
        console.warn('Invalid date provided to calendar link builder:', date);
        return baseRoute;
      }
      
      const ymd = format(targetDate, 'yyyy-MM-dd');
      const params = new URLSearchParams();
      params.set('date', ymd);
      params.set('d', ymd);
      
      if (focusId) {
        params.set('postId', focusId);
      }
      
      if (focusType) {
        params.set('focusType', focusType);
      }
      
      if (classId && classId !== 'ALL_CLASSES') {
        params.set('classId', classId);
      }
      
      return `${baseRoute}?${params.toString()}`;
    } catch (error) {
      console.error('Error building calendar link:', error);
      return this.getCalendarRoute(role);
    }
  }
  
  /**
   * Build calendar link for a post
   */
  static buildPostCalendarLink(post: Post, role: UserRole): string {
    let targetDate: string | undefined;
    
    // Determine date based on post type
    if (post.type === 'EVENTO' && post.eventStartAt) {
      targetDate = post.eventStartAt;
    } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && post.dueAt) {
      targetDate = post.dueAt;
    }
    
    if (!targetDate) {
      // No date available, return basic calendar link
      return this.getCalendarRoute(role);
    }
    
    return this.buildCalendarLink({
      role,
      date: targetDate,
      focusId: post.id,
      focusType: 'post',
      classId: post.classId || post.classIds?.[0]
    });
  }
  
  /**
   * Build calendar link for holiday
   */
  static buildHolidayCalendarLink(date: string | Date, role: UserRole): string {
    return this.buildCalendarLink({
      role,
      date,
      focusType: 'holiday'
    });
  }
  
  /**
   * Get calendar route for user role
   */
  static getCalendarRoute(role: UserRole): string {
    switch (role) {
      case 'aluno':
        return ROUTES.ALUNO.CALENDARIO;
      case 'professor':
        return ROUTES.PROFESSOR.CALENDARIO;
      case 'secretaria':
        return ROUTES.SECRETARIA.CALENDARIO;
      default:
        return ROUTES.SECRETARIA.CALENDARIO; // Safe fallback
    }
  }
  
  /**
   * Check if post has a date for calendar navigation
   */
  static hasDate(post: Post): boolean {
    return (post.type === 'EVENTO' && !!post.eventStartAt) ||
           (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && !!post.dueAt);
  }
}
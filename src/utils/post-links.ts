import { Post } from '@/types/post';
import { ROUTES } from '@/constants/routes';
import { format } from 'date-fns';
import { UnifiedCalendarLinks } from '@/utils/unified-calendar-links';

export type UserRole = 'aluno' | 'professor' | 'secretaria';

/**
 * Unified post link builder
 * Eliminates 404s by directing posts to correct destinations based on type and role
 */
export class PostLinkBuilder {
  /**
   * Get the correct destination for a post based on user role and post type
   * @deprecated Use UnifiedCalendarLinks.buildPostCalendarLink instead
   */
  static buildPostUrl(post: Post, userRole: UserRole): string {
    // Use unified calendar links for posts with dates
    if ((post.type === 'EVENTO' && post.eventStartAt) || 
        (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && post.dueAt)) {
      return UnifiedCalendarLinks.buildPostCalendarLink(post, userRole);
    }

    // Posts without dates (AVISO, COMUNICADO) go to feed with focus
    return this.buildFeedUrlWithFocus(userRole, post.id, post.classId || post.classIds?.[0]);
  }

  /**
   * Build feed URL with post focus (for posts without dates)
   */
  private static buildFeedUrlWithFocus(userRole: UserRole, postId: string, classId?: string): string {
    const params = new URLSearchParams();
    params.set('focus', postId);
    
    if (classId && classId !== 'ALL_CLASSES') {
      params.set('classId', classId);
    }

    const baseRoute = this.getFeedRoute(userRole);
    return `${baseRoute}?${params.toString()}`;
  }

  /**
   * Build calendar URL with date and post focus for notifications
   */
  private static buildCalendarUrlWithFocus(userRole: UserRole, date: string, postId: string, classId?: string): string {
    const dateStr = format(new Date(date), 'yyyy-MM-dd');
    const params = new URLSearchParams();
    params.set('date', dateStr); // Use 'date' instead of 'd' for clarity
    params.set('focus', postId); // Use 'focus' parameter for post highlighting
    params.set('view', 'month'); // Default to month view
    
    if (classId && classId !== 'ALL_CLASSES') {
      params.set('classId', classId);
    }

    const baseRoute = this.getCalendarRoute(userRole);
    return `${baseRoute}?${params.toString()}`;
  }

  /**
   * Build calendar URL with date focus (legacy method for backward compatibility)
   */
  private static buildCalendarUrl(userRole: UserRole, date: string, postId?: string, classId?: string): string {
    const dateStr = format(new Date(date), 'yyyy-MM-dd');
    const params = new URLSearchParams();
    params.set('d', dateStr);
    params.set('modal', 'day'); // Open day focus modal
    
    if (postId) {
      params.set('postId', postId);
    }
    
    if (classId && classId !== 'ALL_CLASSES') {
      params.set('classId', classId);
    }

    const baseRoute = this.getCalendarRoute(userRole);
    return `${baseRoute}?${params.toString()}`;
  }

  /**
   * Build feed URL with filters
   */
  static buildFeedUrl(userRole: UserRole, postId?: string, typeFilter?: string, timeRange?: string): string {
    const params = new URLSearchParams();
    
    if (postId) {
      params.set('focus', postId);
    }
    
    if (typeFilter) {
      params.set('type', typeFilter);
    }
    
    if (timeRange) {
      params.set('range', timeRange);
    }

    const baseRoute = this.getFeedRoute(userRole);
    return params.toString() ? `${baseRoute}?${params.toString()}` : baseRoute;
  }

  /**
   * Get calendar route for user role
   */
  private static getCalendarRoute(userRole: UserRole): string {
    switch (userRole) {
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
   * Get feed route for user role
   */
  private static getFeedRoute(userRole: UserRole): string {
    switch (userRole) {
      case 'aluno':
        return ROUTES.ALUNO.FEED;
      case 'professor':
        // Professor doesn't have a traditional feed, use activities
        return '/professor/atividades';
      case 'secretaria':
        return ROUTES.SECRETARIA.FEED;
      default:
        return ROUTES.SECRETARIA.FEED; // Safe fallback
    }
  }

  /**
   * Check if post has a date (for showing "Ver no calendário" button)
   */
  static hasDate(post: Post): boolean {
    return (post.type === 'EVENTO' && !!post.eventStartAt) ||
           (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && !!post.dueAt);
  }

  /**
   * Get display name for post destination
   */
  static getDestinationName(post: Post): string {
    if (this.hasDate(post)) {
      return 'calendário';
    }
    return 'feed';
  }

  /**
   * Build canonical URL with domain
   */
  static buildCanonicalUrl(post: Post, userRole: UserRole): string {
    const baseUrl = window.location.origin;
    const path = this.buildPostUrl(post, userRole);
    return `${baseUrl}${path}`;
  }
}
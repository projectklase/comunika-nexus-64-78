import { NavigateFunction } from 'react-router-dom';
import { format } from 'date-fns';
import { ROUTES } from '@/constants/routes';
import { CalendarErrorHandler } from './calendar-error-handler';
import { UserRole } from '@/types/auth';

interface CalendarNavigationParams {
  date?: string | Date;
  classId?: string;
  postId?: string;
  view?: 'month' | 'week';
  highlightPost?: boolean;
  openDayModal?: boolean;
}

/**
 * Unified calendar navigation system
 * Prevents 404s and ensures consistent routing
 */
export class UnifiedCalendarNavigation {
  
  /**
   * Get calendar route based on user role
   */
  static getCalendarRoute(userRole?: UserRole): string {
    switch (userRole) {
      case 'aluno':
        return ROUTES.ALUNO.CALENDARIO;
      case 'professor':
        return ROUTES.PROFESSOR.CALENDARIO;
      case 'secretaria':
        return ROUTES.SECRETARIA.CALENDARIO;
      default:
        return '/calendario'; // Safe fallback
    }
  }

  /**
   * Build calendar URL with parameters and validation
   */
  static buildCalendarUrl(userRole: UserRole, params: CalendarNavigationParams = {}): string {
    try {
      const baseUrl = this.getCalendarRoute(userRole);
      const urlParams = new URLSearchParams();

      // Validate and add date parameter
      if (params.date) {
        const targetDate = typeof params.date === 'string' ? new Date(params.date) : params.date;
        if (!isNaN(targetDate.getTime())) {
          urlParams.set('d', format(targetDate, 'yyyy-MM-dd'));
        } else {
          console.warn('Invalid date provided, using current date');
          urlParams.set('d', format(new Date(), 'yyyy-MM-dd'));
        }
      }

      // Add class filter (prevent ALL_CLASSES in URL)
      if (params.classId && params.classId !== 'ALL_CLASSES') {
        urlParams.set('classId', params.classId);
      }

      // Add post highlight
      if (params.postId) {
        urlParams.set('postId', params.postId);
        if (params.highlightPost) {
          urlParams.set('highlight', 'true');
        }
      }

      // Add view if not default
      if (params.view && params.view !== 'month') {
        urlParams.set('v', params.view);
      }

      // Open day modal if requested
      if (params.openDayModal) {
        urlParams.set('modal', 'day');
        if (!urlParams.get('d')) {
          urlParams.set('d', format(new Date(), 'yyyy-MM-dd'));
        }
      }

      const queryString = urlParams.toString();
      return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    } catch (error) {
      console.error('Error building calendar URL:', error);
      return this.getCalendarRoute(userRole);
    }
  }

  /**
   * Navigate to calendar with error handling
   */
  static navigateToCalendar(
    navigate: NavigateFunction,
    userRole: UserRole,
    params: CalendarNavigationParams = {}
  ): void {
    try {
      const url = this.buildCalendarUrl(userRole, params);
      navigate(url);
    } catch (error) {
      CalendarErrorHandler.handleNavigationError(error, navigate);
    }
  }

  /**
   * Navigate to class calendar
   */
  static navigateToClassCalendar(
    navigate: NavigateFunction,
    userRole: UserRole,
    classId: string,
    date?: string | Date
  ): void {
    try {
      if (!classId) {
        throw new Error('Class ID is required');
      }

      let basePath = '/secretaria'; // fallback
      
      switch (userRole) {
        case 'professor':
          basePath = '/professor';
          break;
        case 'aluno':
          basePath = '/aluno';
          break;
        case 'secretaria':
          basePath = '/secretaria';
          break;
      }
      
      let route = `${basePath}/turma/${classId}/calendario`;
      
      if (date) {
        const targetDate = typeof date === 'string' ? new Date(date) : date;
        if (!isNaN(targetDate.getTime())) {
          const params = new URLSearchParams();
          params.set('d', format(targetDate, 'yyyy-MM-dd'));
          params.set('modal', 'day');
          route += `?${params.toString()}`;
        }
      }
      
      navigate(route);
    } catch (error) {
      CalendarErrorHandler.handleNavigationError(error, navigate);
    }
  }

  /**
   * Navigate to event in calendar
   */
  static navigateToEvent(
    navigate: NavigateFunction,
    userRole: UserRole,
    eventStartAt: string,
    postId?: string,
    classId?: string
  ): void {
    this.navigateToCalendar(navigate, userRole, {
      date: eventStartAt,
      postId,
      classId,
      view: 'month',
      highlightPost: true,
      openDayModal: true
    });
  }

  /**
   * Navigate to activity in calendar
   */
  static navigateToActivity(
    navigate: NavigateFunction,
    userRole: UserRole,
    dueAt: string,
    postId?: string,
    classId?: string
  ): void {
    this.navigateToCalendar(navigate, userRole, {
      date: dueAt,
      postId,
      classId,
      view: 'month',
      highlightPost: true,
      openDayModal: true
    });
  }
}
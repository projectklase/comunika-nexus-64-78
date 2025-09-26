import { UnifiedCalendarLinks, UserRole } from '@/utils/unified-calendar-links';
import { Notification } from '@/stores/notification-store';

export interface NotificationTarget {
  destination: 'calendar' | 'feed' | 'modal';
  url: string;
  shouldAutoAdjustFilters?: boolean;
}

/**
 * Resolve where a notification should navigate based on its type and content
 */
export function resolveNotificationTarget(
  notification: Notification, 
  currentRole: UserRole
): NotificationTarget {
  
  // Holiday notifications always go to calendar
  if (notification.type === 'HOLIDAY' && notification.meta?.holidayDate) {
    return {
      destination: 'calendar',
      url: UnifiedCalendarLinks.buildHolidayCalendarLink(notification.meta.holidayDate, currentRole)
    };
  }

  // Post notifications
  if (notification.meta?.postId) {
    const postType = notification.meta.postType || 'AVISO';
    
    // Check if post has a date (events and activities with due dates)
    const hasDate = (postType === 'EVENTO' && notification.meta.eventStartAt) || 
                    (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postType) && notification.meta.dueDate);
    
    if (hasDate) {
      // Posts with dates: navigate to calendar
      const mockPost = {
        id: notification.meta.postId,
        type: postType,
        title: notification.title,
        dueAt: notification.meta.dueDate,
        eventStartAt: notification.meta.eventStartAt,
        classId: notification.meta.classId
      } as any;
      
      return {
        destination: 'calendar',
        url: UnifiedCalendarLinks.buildPostCalendarLink(mockPost, currentRole)
      };
    } else {
      // Posts without dates (AVISO, COMUNICADO): go to feed with focus
      const feedUrl = getFeedRoute(currentRole);
      const params = new URLSearchParams();
      params.set('postId', notification.meta.postId);
      params.set('focus', '1');
      
      if (notification.meta.classId && notification.meta.classId !== 'ALL_CLASSES') {
        params.set('classId', notification.meta.classId);
      }
      
      return {
        destination: 'feed',
        url: `${feedUrl}?${params.toString()}`,
        shouldAutoAdjustFilters: true
      };
    }
  }

  // Rewards notifications - use their specific links
  if (['KOINS_EARNED', 'KOIN_BONUS', 'REDEMPTION_APPROVED', 'REDEMPTION_REJECTED'].includes(notification.type)) {
    return {
      destination: 'feed',
      url: notification.link || '/aluno/loja-recompensas?tab=history'
    };
  }

  // Redemption request notifications for secretaria
  if (notification.type === 'REDEMPTION_REQUESTED') {
    return {
      destination: 'feed',
      url: notification.link || '/secretaria/gerenciar-recompensas?tab=redemptions'
    };
  }

  // Password reset notifications
  if (notification.type.startsWith('RESET_')) {
    return {
      destination: 'feed',
      url: '/secretaria/password-resets'
    };
  }

  // Default fallback: go to respective feed
  return {
    destination: 'feed',
    url: getFeedRoute(currentRole)
  };
}

/**
 * Get feed route for user role
 */
function getFeedRoute(role: UserRole): string {
  switch (role) {
    case 'secretaria':
      return '/secretaria/feed';
    case 'professor':
      return '/professor/feed';
    case 'aluno':
      return '/aluno/feed';
    default:
      return '/secretaria/feed'; // Safe fallback
  }
}

/**
 * Check if a post type has a date for calendar navigation
 */
export function postHasDate(postType: string, meta: Record<string, any>): boolean {
  return (postType === 'EVENTO' && meta.eventStartAt) ||
         (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postType) && meta.dueDate);
}
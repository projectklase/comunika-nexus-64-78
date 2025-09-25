import { NavigateFunction } from 'react-router-dom';

export interface DeepLinkTarget {
  type: 'post' | 'calendar-day' | 'calendar-event';
  id: string;
  date?: string;
  classId?: string;
}

/**
 * Smart scroll utility that centers target element smoothly
 */
export function smartScrollToElement(selector: string, options?: { 
  offset?: number; 
  behavior?: ScrollBehavior;
  timeout?: number;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const { offset = 0, behavior = 'smooth', timeout = 2000 } = options || {};
    
    const attemptScroll = () => {
      const element = document.querySelector(selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + (rect.height / 2);
        const viewportCenter = window.innerHeight / 2;
        const scrollY = window.scrollY + (elementCenter - viewportCenter) + offset;
        
        window.scrollTo({
          top: Math.max(0, scrollY),
          behavior
        });
        
        // Add focus for accessibility
        if (element instanceof HTMLElement) {
          element.focus({ preventScroll: true });
          element.classList.add('notification-target-highlight');
          setTimeout(() => {
            element.classList.remove('notification-target-highlight');
          }, 2000);
        }
        
        resolve(true);
        return;
      }
      resolve(false);
    };
    
    // Try immediately
    attemptScroll();
    
    // Retry after DOM updates if needed
    setTimeout(() => {
      attemptScroll();
    }, 100);
    
    // Final timeout
    setTimeout(() => {
      resolve(false);
    }, timeout);
  });
}

/**
 * Navigate with deep link and smart scroll
 */
export async function navigateWithScroll(
  navigate: NavigateFunction, 
  target: DeepLinkTarget, 
  options?: { replace?: boolean }
): Promise<void> {
  const { replace = false } = options || {};
  
  switch (target.type) {
    case 'post': {
      // Navigate to feed and scroll to post
      navigate(target.classId ? `/aluno/feed?class=${target.classId}` : '/aluno/feed', { replace });
      
      // Wait for navigation then scroll
      setTimeout(async () => {
        const success = await smartScrollToElement(`[data-post-id="${target.id}"]`, { 
          offset: -100 
        });
        if (!success) {
          console.warn(`Post ${target.id} not found for smart scroll`);
        }
      }, 200);
      break;
    }
    
    case 'calendar-day': {
      // Navigate to calendar and open day
      const calendarPath = target.classId 
        ? `/professor/calendario/turma/${target.classId}`
        : '/aluno/calendario';
        
      navigate(`${calendarPath}?date=${target.date}`, { replace });
      
      // Focus on specific day
      setTimeout(async () => {
        const dateKey = target.date?.replace(/-/g, '');
        const success = await smartScrollToElement(`[data-calendar-date="${dateKey}"]`, { 
          offset: -120 
        });
        if (!success) {
          console.warn(`Calendar date ${target.date} not found for smart scroll`);
        }
      }, 300);
      break;
    }
    
    case 'calendar-event': {
      // Navigate to calendar and focus event
      const calendarPath = target.classId 
        ? `/professor/calendario/turma/${target.classId}`
        : '/aluno/calendario';
        
      navigate(`${calendarPath}?event=${target.id}`, { replace });
      
      // Focus on specific event
      setTimeout(async () => {
        const success = await smartScrollToElement(`[data-event-id="${target.id}"]`, { 
          offset: -100 
        });
        if (!success) {
          console.warn(`Calendar event ${target.id} not found for smart scroll`);
        }
      }, 300);
      break;
    }
    
    default:
      console.warn('Unknown deep link target type:', target);
  }
}

/**
 * Parse notification link into deep link target
 */
export function parseNotificationLink(link: string): DeepLinkTarget | null {
  try {
    const url = new URL(link, window.location.origin);
    const pathname = url.pathname;
    const params = new URLSearchParams(url.search);
    
    // Post links: /feed?post=123 or /aluno/feed?post=123&class=456
    if (pathname.includes('/feed')) {
      const postId = params.get('post');
      const classId = params.get('class');
      
      if (postId) {
        return {
          type: 'post',
          id: postId,
          classId: classId || undefined
        };
      }
    }
    
    // Calendar day links: /calendario?date=2024-01-15
    if (pathname.includes('/calendario')) {
      const date = params.get('date');
      const eventId = params.get('event');
      const classId = pathname.match(/turma\/([^\/]+)/)?.[1];
      
      if (eventId) {
        return {
          type: 'calendar-event',
          id: eventId,
          date,
          classId
        };
      }
      
      if (date) {
        return {
          type: 'calendar-day',
          id: date,
          date,
          classId
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing notification link:', error);
    return null;
  }
}

/**
 * Generate notification link for posts
 */
export function generatePostLink(postId: string, classId?: string): string {
  const base = '/aluno/feed';
  const params = new URLSearchParams({ post: postId });
  if (classId) params.set('class', classId);
  
  return `${base}?${params.toString()}`;
}

/**
 * Generate notification link for calendar events (role-aware)
 */
export function generateCalendarLink(date: string, eventId?: string, classId?: string): string {
  // Default to current user's calendar
  const base = classId ? `/professor/calendario/turma/${classId}` : '/calendario';
  const params = new URLSearchParams({ date });
  if (eventId) params.set('event', eventId);
  
  return `${base}?${params.toString()}`;
}
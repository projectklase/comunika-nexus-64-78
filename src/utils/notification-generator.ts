import { notificationStore, RoleTarget, NotificationType } from '@/stores/notification-store';
import { Post } from '@/types/post';
import { generatePostLink, generateCalendarLink } from './deep-links';
import { getCurrentWeekHolidays, generateHolidayNotificationKey, formatHolidayNotification } from './holiday-weekly';
import { startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Generate unique notification key to prevent duplicates
 */
function generateNotificationKey(
  type: string,
  entityId: string,
  scope: string,
  window: string
): string {
  return `${type}:${entityId}:${scope}:${window}`;
}

/**
 * Check if notification already exists (async version)
 */
async function notificationExistsAsync(key: string, userId: string): Promise<boolean> {
  const existing = await notificationStore.listAsync({ userId });
  return existing.some(n => n.meta?.notificationKey?.includes(key));
}

/**
 * Generate notifications for new/updated posts
 */
export async function generatePostNotifications(
  post: Post,
  action: 'created' | 'updated' | 'deadline_changed',
  oldPost?: Partial<Post>
): Promise<void> {
  console.log('[generatePostNotifications] Delegating to edge function for post:', post.id, 'action:', action);
  
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    const { data, error } = await supabase.functions.invoke('create-post-notifications', {
      body: {
        post,
        action,
        oldPost
      }
    });
    
    if (error) {
      console.error('[generatePostNotifications] Edge function error:', error);
      throw error;
    }
    
    console.log('[generatePostNotifications] Success:', data?.created, 'notifications created');
  } catch (error) {
    console.error('[generatePostNotifications] Failed to create post notifications:', error);
    throw error;
  }
}

/**
 * Generate weekly holiday notifications for all users
 */
export function generateWeeklyHolidayNotifications(userId: string, userRole: RoleTarget): void {
  const currentDate = new Date();
  const weekStart = startOfWeek(currentDate, { locale: ptBR, weekStartsOn: 1 });
  const weekStartStr = weekStart.toISOString().split('T')[0];
  
  const weekHolidays = getCurrentWeekHolidays(currentDate);
  
  // Track existing keys to avoid duplicates
  const existingNotifications = notificationStore.list({
    roleTarget: userRole,
    type: 'HOLIDAY'
  });
  
  const existingKeys = new Set(
    existingNotifications
      .filter(n => n.meta?.weekStart === weekStartStr)
      .map(n => n.meta?.notificationKey)
      .filter(Boolean)
  );
  
  weekHolidays.forEach(holiday => {
    const key = generateHolidayNotificationKey(holiday, userId, weekStartStr);
    
    // Skip if already exists
    if (existingKeys.has(key)) {
      return;
    }
    
    const holidayNotification = formatHolidayNotification(holiday);
    
    const notification = {
      type: 'HOLIDAY' as NotificationType,
      title: holidayNotification.title,
      message: holidayNotification.message,
      roleTarget: userRole,
      userId,
      link: generateCalendarLink(holiday.date),
      meta: {
        ...holidayNotification.meta,
        notificationKey: key,
        weekStart: weekStartStr,
        userId
      }
    };
    
    notificationStore.add(notification);
  });
}

/**
 * Initialize notification system - generate holiday notifications for current user
 */
export function initializeUserNotifications(userId: string, userRole: RoleTarget): void {
  // Generate holiday notifications for current week
  generateWeeklyHolidayNotifications(userId, userRole);
}

/**
 * Clean up old notification keys to prevent memory issues
 */
export function cleanupOldNotifications(): void {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // This is handled by the notification store's cleanup routine
  // Just trigger it manually if needed
  notificationStore.clear(true); // true = only delete read notifications
}
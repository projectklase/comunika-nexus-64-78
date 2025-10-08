import { notificationStore, RoleTarget } from '@/stores/notification-store';
import { getCurrentWeekHolidays, generateHolidayNotificationKey, formatHolidayNotification } from './holiday-weekly';
import { startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

/**
 * Generate weekly holiday notifications with timezone awareness and deduplication
 */
export async function generateWeeklyHolidayNotifications(userId: string, userRole: RoleTarget): Promise<void> {
  const brazilTimeZone = 'America/Sao_Paulo';
  const currentDateBR = toZonedTime(new Date(), brazilTimeZone);
  const weekStart = startOfWeek(currentDateBR, { locale: ptBR, weekStartsOn: 1 });
  const weekStartStr = weekStart.toISOString().split('T')[0];
  
  const weekHolidays = getCurrentWeekHolidays(currentDateBR);
  
  // Track existing notifications to avoid duplicates
  const existingNotifications = await notificationStore.listAsync({
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
      type: 'HOLIDAY' as const,
      title: holidayNotification.title,
      message: holidayNotification.message,
      roleTarget: userRole,
      link: holidayNotification.link,
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
 * Initialize holiday notifications for new user session
 */
export async function initializeHolidayNotifications(userId: string, userRole: RoleTarget): Promise<void> {
  await generateWeeklyHolidayNotifications(userId, userRole);
  
  // Schedule check for next week's holidays (in a real app, this would be handled by a cron job)
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  
  // In production, you'd use a proper scheduler
  setTimeout(() => {
    generateWeeklyHolidayNotifications(userId, userRole);
  }, 7 * 24 * 60 * 60 * 1000); // 7 days
}

/**
 * Force refresh holiday notifications (for when holiday list changes)
 */
export async function refreshHolidayNotifications(userId: string, userRole: RoleTarget): Promise<void> {
  // Clear existing holiday notifications for this user
  const existing = await notificationStore.listAsync({ roleTarget: userRole, type: 'HOLIDAY' });
  existing.forEach(n => {
    if (n.meta?.userId === userId) {
      notificationStore.markRead(n.id);
    }
  });
  
  // Generate fresh notifications
  await generateWeeklyHolidayNotifications(userId, userRole);
}
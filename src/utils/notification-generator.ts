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
 * Check if notification already exists
 */
function notificationExists(key: string): boolean {
  const existing = notificationStore.list({});
  return existing.some(n => n.meta?.notificationKey === key);
}

/**
 * Generate notifications for new/updated posts
 */
export function generatePostNotifications(
  post: Post,
  action: 'created' | 'updated' | 'deadline_changed',
  oldPost?: Partial<Post>
): void {
  const isImportant = post.meta?.important || false;
  const today = new Date().toISOString().split('T')[0];
  
  // Determine scope for deduplication
  const scope = post.audience === 'CLASS' && post.classIds?.length 
    ? `CLASS:${post.classIds.join(',')}`
    : 'GLOBAL';
    
  // Generate unique key
  const actionKey = action === 'deadline_changed' ? 'deadline' : action;
  const key = generateNotificationKey('post', post.id, scope, actionKey);
  
  // Skip if notification already exists (prevents duplicates)
  if (notificationExists(key)) {
    return;
  }
  
  // Determine target audiences
  const audiences: RoleTarget[] = [];
  
  if (post.audience === 'GLOBAL') {
    audiences.push('ALUNO', 'PROFESSOR');
    if (post.type === 'AVISO' || post.type === 'COMUNICADO') {
      audiences.push('SECRETARIA');
    }
  } else if (post.audience === 'CLASS') {
    audiences.push('ALUNO');
    if (post.classIds?.length) {
      audiences.push('PROFESSOR'); // Teachers of selected classes
    }
  }
  
  // Generate action-specific content
  let titlePrefix = '';
  let messageAction = '';
  
  switch (action) {
    case 'created':
      titlePrefix = 'Novo';
      messageAction = 'foi publicado';
      break;
    case 'updated':
      titlePrefix = 'Atualizado';
      messageAction = 'foi atualizado';
      break;
    case 'deadline_changed':
      titlePrefix = 'Prazo alterado';
      messageAction = 'teve o prazo alterado';
      break;
  }
  
  // Post type labels
  const typeLabels: Record<string, string> = {
    ATIVIDADE: 'atividade',
    TRABALHO: 'trabalho', 
    PROVA: 'prova',
    EVENTO: 'evento',
    AVISO: 'aviso',
    COMUNICADO: 'comunicado'
  };
  
  const postTypeLabel = typeLabels[post.type] || 'post';
  
  // Create notifications for each audience
  audiences.forEach(roleTarget => {
    const notification = {
      type: (isImportant ? 'POST_IMPORTANT' : 'POST_NEW') as NotificationType,
      title: `${titlePrefix} ${postTypeLabel}: ${post.title}`,
      message: `${post.title} ${messageAction}${post.dueAt ? ` - Prazo: ${new Date(post.dueAt).toLocaleDateString('pt-BR')}` : ''}`,
      roleTarget,
      link: generatePostLink(post.id, post.classIds?.[0]),
      meta: {
        postId: post.id,
        postType: post.type,
        action,
        scope,
        important: isImportant,
        notificationKey: key,
        authorName: post.authorName,
        classId: post.classIds?.[0],
        dueDate: post.dueAt,
        eventStartAt: post.eventStartAt
      }
    };
    
    notificationStore.add(notification);
  });
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
  notificationStore.clear('ARCHIVED');
}
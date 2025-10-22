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
  const isImportant = post.meta?.important || false;
  
  console.log(`[NotificationGen] START - Post: ${post.id}, Type: ${post.type}, Important: ${isImportant}, Action: ${action}`);
  
  // Determine scope for deduplication
  const scope = post.audience === 'CLASS' && post.classIds?.length 
    ? `CLASS:${post.classIds.join(',')}`
    : 'GLOBAL';
    
  // Generate unique key
  const actionKey = action === 'deadline_changed' ? 'deadline' : action;
  const baseKey = generateNotificationKey('post', post.id, scope, actionKey);
  
  // Determine target audiences
  const audiences: RoleTarget[] = [];
  
  if (post.audience === 'GLOBAL') {
    audiences.push('ALUNO', 'PROFESSOR');
    // Secretaria vê AVISOS, COMUNICADOS ou qualquer post importante
    if (post.type === 'AVISO' || post.type === 'COMUNICADO' || isImportant) {
      audiences.push('SECRETARIA');
    }
  } else if (post.audience === 'CLASS') {
    audiences.push('ALUNO');
    if (post.classIds?.length) {
      audiences.push('PROFESSOR'); // Teachers of selected classes
    }
    // Se importante, secretaria também recebe
    if (isImportant) {
      audiences.push('SECRETARIA');
    }
  }
  
  console.log(`[NotificationGen] Target audiences: ${audiences.join(', ')} for ${post.audience} post`);
  
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
  
  console.log(`[NotificationGen] 📋 Post info:`, {
    id: post.id,
    type: post.type,
    title: post.title,
    audience: post.audience,
    classIds: post.classIds,
    important: isImportant,
    targetAudiences: audiences.join(', ')
  });
  
  // Import supabase client
  const { supabase } = await import('@/integrations/supabase/client');
  
  // Get specific users for each roleTarget
  for (const roleTarget of audiences) {
    console.log(`[NotificationGen] Processing roleTarget: ${roleTarget}`);
    
    try {
      // Build query to get users
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);
      
      // Filter by role
      const roleMapping: Record<RoleTarget, string> = {
        'ALUNO': 'aluno',
        'PROFESSOR': 'professor',
        'SECRETARIA': 'secretaria'
      };
      
      // Get users with this role
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', roleMapping[roleTarget] as any);
      
      if (roleError) {
        console.error(`[NotificationGen] Error fetching user roles for ${roleTarget}:`, roleError);
        continue;
      }
      
      const userIds = userRoles?.map(r => r.user_id) || [];
      console.log(`[NotificationGen] Found ${userIds.length} users with role ${roleTarget}`);
      
      if (userIds.length === 0) {
        console.log(`[NotificationGen] No users found for ${roleTarget}, skipping`);
        continue;
      }
      
      // For CLASS audience, further filter by class membership
      let targetUserIds = userIds;
      if (post.audience === 'CLASS' && post.classIds?.length && roleTarget === 'ALUNO') {
        const { data: classStudents, error: classError } = await supabase
          .from('class_students')
          .select('student_id')
          .in('class_id', post.classIds);
        
        if (!classError && classStudents) {
          const classUserIds = classStudents.map(cs => cs.student_id);
          targetUserIds = userIds.filter(id => classUserIds.includes(id));
          console.log(`[NotificationGen] Filtered to ${targetUserIds.length} students in class(es)`);
        }
      }
      
      console.log(`[NotificationGen] Will create ${targetUserIds.length} notifications for ${roleTarget}`);
      console.log(`[NotificationGen] 🎯 Target user IDs:`, targetUserIds);
      
      // Create notification for each user (process sequentially to avoid overwhelming DB)
      const results: any[] = [];
      
      for (let index = 0; index < targetUserIds.length; index++) {
        const userId = targetUserIds[index];
        console.log(`[NotificationGen] 🔄 Processing user ${index + 1}/${targetUserIds.length}: ${userId}`);
        
        try {
          const notificationKey = `${baseKey}:${userId}`;
          
          // Check if notification already exists for this user
          if (await notificationExistsAsync(baseKey, userId)) {
            console.log(`[NotificationGen] ⏭️ Notification already exists for user ${userId}, skipping`);
            results.push(null);
            continue;
          }
          
          console.log(`[NotificationGen] ✨ Creating notification for user ${userId}:`, {
            type: isImportant ? 'POST_IMPORTANT' : 'POST_NEW',
            postId: post.id,
            postTitle: post.title,
            roleTarget,
            isImportant,
            userId: userId
          });
          
          const notification = {
            type: (isImportant ? 'POST_IMPORTANT' : 'POST_NEW') as NotificationType,
            title: `${titlePrefix} ${postTypeLabel}: ${post.title}`,
            message: `${post.title} ${messageAction}${post.dueAt ? ` - Prazo: ${new Date(post.dueAt).toLocaleDateString('pt-BR')}` : ''}`,
            roleTarget,
            userId,
            link: generatePostLink(post.id, post.classIds?.[0]),
            meta: {
              postId: post.id,
              postType: post.type,
              action,
              scope,
              important: isImportant,
              notificationKey,
              authorName: post.authorName,
              classId: post.classIds?.[0],
              dueDate: post.dueAt,
              eventStartAt: post.eventStartAt
            }
          };
          
          console.log(`[NotificationGen] 📤 Calling notificationStore.add with userId:`, userId);
          const result = await notificationStore.add(notification);
          console.log(`[NotificationGen] ✅ Notification created for user ${userId}:`, result?.id);
          results.push(result);
        } catch (userError) {
          console.error(`[NotificationGen] ❌ Failed to create notification for user ${userId}:`, userError);
          results.push(null);
        }
      }
      
      const successCount = results.filter(r => r).length;
      const failedCount = targetUserIds.length - successCount;
      
      if (failedCount > 0) {
        console.error(`[NotificationGen] ⚠️ ${failedCount} notificações falharam para ${roleTarget}. Possível problema de RLS.`);
      }
      
      console.log(`[NotificationGen] ✅ Criadas ${successCount}/${targetUserIds.length} notificações para ${roleTarget}`);
      
    } catch (error) {
      console.error(`[NotificationGen] Error creating notifications for ${roleTarget}:`, error);
    }
  }
  
  console.log(`[NotificationGen] END - Finished processing post ${post.id}`);
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
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
  // Determine scope for deduplication
  const scope = post.audience === 'CLASS' && post.classIds?.length 
    ? `CLASS:${post.classIds.join(',')}`
    : 'GLOBAL';
    
  // Generate unique key
  const actionKey = action === 'deadline_changed' ? 'deadline' : action;
  const baseKey = generateNotificationKey('post', post.id, scope, actionKey);
  
  // Determine target audiences based on simplified matrix
  const audiences: RoleTarget[] = [];
  
  if (['EVENTO', 'COMUNICADO', 'AVISO'].includes(post.type)) {
    // Eventos, Comunicados, Avisos → Todos recebem
    if (post.audience === 'GLOBAL') {
      audiences.push('ALUNO', 'PROFESSOR', 'SECRETARIA');
    } else { // CLASS
      audiences.push('ALUNO', 'PROFESSOR', 'SECRETARIA');
    }
  } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) {
    // Atividades → Apenas alunos e professores da turma
    audiences.push('ALUNO', 'PROFESSOR');
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
  
  // Import supabase client
  const { supabase } = await import('@/integrations/supabase/client');
  
  // Get specific users for each roleTarget
  for (const roleTarget of audiences) {
    try {
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
        console.error(`Error fetching user roles for ${roleTarget}:`, roleError);
        continue;
      }
      
      const userIds = userRoles?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) {
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
        }
      }
      
      // Create notification for each user
      for (const recipientUserId of targetUserIds) {
        try {
          const notificationKey = `${baseKey}:${recipientUserId}`;
          
          // Check if notification already exists for this user
          if (await notificationExistsAsync(baseKey, recipientUserId)) {
            continue;
          }
          
          const notification = {
            type: 'POST_NEW' as NotificationType,
            title: `${titlePrefix} ${postTypeLabel}: ${post.title}`,
            message: `${post.title} ${messageAction}${post.dueAt ? ` - Prazo: ${new Date(post.dueAt).toLocaleDateString('pt-BR')}` : ''}`,
            roleTarget,
            userId: recipientUserId,
            link: generatePostLink(post.id, post.classIds?.[0]),
            meta: {
              postId: post.id,
              postType: post.type,
              action,
              scope,
              notificationKey,
              authorName: post.authorName,
              classId: post.classIds?.[0],
              dueDate: post.dueAt,
              eventStartAt: post.eventStartAt
            }
          };
          
          await notificationStore.add(notification);
        } catch (userError: any) {
          console.error(`Failed to create notification for user ${recipientUserId}:`, userError?.message);
        }
      }
      
    } catch (error: any) {
      console.error(`Error processing roleTarget ${roleTarget}:`, error?.message);
    }
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
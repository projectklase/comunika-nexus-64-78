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
  console.log(`[NotificationGen] START - Post: ${post.id}, Type: ${post.type}, Action: ${action}`);
  
  // Determine scope for deduplication
  const scope = post.audience === 'CLASS' && post.classIds?.length 
    ? `CLASS:${post.classIds.join(',')}`
    : 'GLOBAL';
    
  // Generate unique key
  const actionKey = action === 'deadline_changed' ? 'deadline' : action;
  const baseKey = generateNotificationKey('post', post.id, scope, actionKey);
  
  console.log(`[NotificationGen] 🔍 Building audiences for post:`, {
    postId: post.id,
    audience: post.audience,
    type: post.type,
    classIds: post.classIds
  });
  
  // Determine target audiences based on simplified matrix
  const audiences: RoleTarget[] = [];
  
  if (['EVENTO', 'COMUNICADO', 'AVISO'].includes(post.type)) {
    // Eventos, Comunicados, Avisos → Todos recebem
    if (post.audience === 'GLOBAL') {
      audiences.push('ALUNO', 'PROFESSOR', 'SECRETARIA');
      console.log(`[NotificationGen] ✅ ${post.type} GLOBAL → ALUNO, PROFESSOR, SECRETARIA`);
    } else { // CLASS
      audiences.push('ALUNO', 'PROFESSOR', 'SECRETARIA');
      console.log(`[NotificationGen] ✅ ${post.type} CLASS → ALUNO, PROFESSOR, SECRETARIA`);
    }
  } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) {
    // Atividades → Apenas alunos e professores da turma
    audiences.push('ALUNO', 'PROFESSOR');
    console.log(`[NotificationGen] ✅ ${post.type} → ALUNO, PROFESSOR (da turma)`);
  }
  
  console.log(`[NotificationGen] 📋 Final audiences:`, audiences.join(', '));
  
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
    targetAudiences: audiences.join(', ')
  });
  
  console.log(`[NotificationGen] 🎯 Will process ${audiences.length} role targets:`, audiences);
  
  // Import supabase client
  const { supabase } = await import('@/integrations/supabase/client');
  
  // Get specific users for each roleTarget
  for (let i = 0; i < audiences.length; i++) {
    const roleTarget = audiences[i];
    console.log(`[NotificationGen] ========================================`);
    console.log(`[NotificationGen] 🔄 Loop iteration ${i + 1}/${audiences.length}`);
    console.log(`[NotificationGen] 🔄 Current roleTarget: ${roleTarget}`);
    console.log(`[NotificationGen] 🔄 Remaining roleTargets: ${audiences.slice(i + 1).join(', ') || 'none'}`);
    
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
        console.error(`[NotificationGen] ❌ Error fetching user roles for ${roleTarget}:`, roleError);
        console.error(`[NotificationGen] ❌ Error details:`, JSON.stringify(roleError, null, 2));
        // Continue to next role instead of stopping
        continue;
      }
      
      const userIds = userRoles?.map(r => r.user_id) || [];
      console.log(`[NotificationGen] ✅ Found ${userIds.length} users with role ${roleTarget}`);
      console.log(`[NotificationGen] 📋 User IDs for ${roleTarget}:`, userIds);
      
      if (userIds.length === 0) {
        console.warn(`[NotificationGen] ⚠️ No users found for ${roleTarget}, skipping this role`);
        // Continue to next role instead of stopping
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
      
      console.log(`[NotificationGen] 🎯 Will create ${targetUserIds.length} notifications for ${roleTarget}`);
      console.log(`[NotificationGen] 📋 Target user IDs for ${roleTarget}:`, targetUserIds);
      
      // Create notification for each user (process sequentially to avoid overwhelming DB)
      const results: any[] = [];
      let successCount = 0;
      let failCount = 0;
      
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
            type: 'POST_NEW',
            postId: post.id,
            postTitle: post.title,
            roleTarget,
            userId: userId
          });
          
          const notification = {
            type: 'POST_NEW' as NotificationType,
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
          successCount++;
        } catch (userError: any) {
          console.error(`[NotificationGen] ❌ Failed to create notification for user ${userId}:`, userError);
          console.error(`[NotificationGen] ❌ Error message:`, userError?.message);
          console.error(`[NotificationGen] ❌ Error details:`, JSON.stringify(userError, null, 2));
          results.push(null);
          failCount++;
        }
      }
      
      console.log(`[NotificationGen] 📊 Summary for ${roleTarget}:`);
      console.log(`[NotificationGen]    ✅ Success: ${successCount}`);
      console.log(`[NotificationGen]    ❌ Failed: ${failCount}`);
      console.log(`[NotificationGen]    📝 Total attempted: ${targetUserIds.length}`);
      
      if (failCount > 0) {
        console.error(`[NotificationGen] ⚠️ ${failCount} notificações falharam para ${roleTarget}. Possível problema de RLS ou permissões.`);
      }
      
    } catch (error: any) {
      console.error(`[NotificationGen] ❌ FATAL ERROR processing roleTarget ${roleTarget}:`, error);
      console.error(`[NotificationGen] ❌ Error message:`, error?.message);
      console.error(`[NotificationGen] ❌ Error stack:`, error?.stack);
      // Continue to next role instead of stopping completely
      console.log(`[NotificationGen] ⏭️ Continuing to next roleTarget despite error`);
    }
    
    console.log(`[NotificationGen] ✅ Completed processing for ${roleTarget}, moving to next`);
  }
  
  console.log(`[NotificationGen] 🏁 For loop completed, processed ${audiences.length} roleTargets`);
  console.log(`[NotificationGen] ========================================`);
  console.log(`[NotificationGen] 🏁 END - Finished processing post ${post.id}`);
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
import { supabase } from '@/integrations/supabase/client';

export type NotificationType =
  | 'RESET_REQUESTED'
  | 'RESET_IN_PROGRESS'
  | 'RESET_COMPLETED'
  | 'RESET_CANCELLED'
  | 'POST_NEW'
  | 'POST_IMPORTANT'
  | 'HOLIDAY'
  | 'KOINS_EARNED'
  | 'KOIN_BONUS'
  | 'REDEMPTION_REQUESTED'
  | 'REDEMPTION_APPROVED'
  | 'REDEMPTION_REJECTED';

export type RoleTarget = 'SECRETARIA' | 'PROFESSOR' | 'ALUNO';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  roleTarget: RoleTarget;
  isRead: boolean;
  createdAt: string;
  link?: string;
  meta?: Record<string, any>;
  userId: string;
}

interface NotificationFilters {
  isRead?: boolean;
  search?: string;
  limit?: number;
  roleTarget?: RoleTarget;
  type?: NotificationType;
  userId?: string;
}

// Helper to convert DB row to app format
function dbRowToNotification(row: any): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    roleTarget: row.role_target,
    isRead: row.is_read || false,
    createdAt: row.created_at,
    link: row.link,
    meta: row.meta,
    userId: row.user_id
  };
}

// Store class for backward compatibility
class NotificationStore {
  private subscribers: Set<() => void> = new Set();

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in notification store subscriber:', error);
      }
    });
  }

  list(filters: NotificationFilters = {}): Notification[] {
    // For backward compatibility, return empty array
    // Components should use async version or subscribe to changes
    console.warn('notificationStore.list() is deprecated. Use listAsync() instead.');
    return [];
  }

  async listAsync(filters: NotificationFilters = {}): Promise<Notification[]> {
    const queryBuilder = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    // Build query step by step to avoid type instantiation issues
    const { data, error } = await (async () => {
      let q = queryBuilder;
      
      if (filters.userId) {
        q = q.eq('user_id', filters.userId);
      }
      if (filters.isRead !== undefined) {
        q = q.eq('is_read', filters.isRead);
      }
      if (filters.roleTarget) {
        q = q.eq('role_target', filters.roleTarget);
      }
      if (filters.type) {
        q = q.eq('type', filters.type);
      }
      if (filters.limit) {
        q = q.limit(filters.limit);
      }
      if (filters.search) {
        q = q.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
      }
      
      return await q;
    })();

    if (error) {
      console.error('Error listing notifications:', error);
      throw error;
    }

    return (data || []).map(dbRowToNotification);
  }

  async add(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'userId'> & { roleTarget: RoleTarget; userId?: string }): Promise<Notification> {
    // CRITICAL: Validate userId - NEVER use fallback
    const userId = notification.userId || notification.meta?.studentId || notification.meta?.userId;
    
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
      console.error('[NotificationStore] Cannot create notification without valid userId', notification);
      throw new Error('userId is required for notifications');
    }
    
    // Check for duplicates (within 5 seconds window)
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', notification.type)
      .eq('title', notification.title)
      .gte('created_at', new Date(Date.now() - 5000).toISOString());
    
    if (existing && existing.length > 0) {
      console.log('[NotificationStore] Duplicate notification prevented');
      return dbRowToNotification(await supabase.from('notifications').select('*').eq('id', existing[0].id).single().then(r => r.data!));
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        role_target: notification.roleTarget,
        user_id: userId,
        link: notification.link || null,
        meta: notification.meta || null,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('[NotificationStore] Error adding notification:', error);
      throw error;
    }

    this.notifySubscribers();
    return dbRowToNotification(data);
  }

  async markRead(id: string): Promise<void> {
    console.log('[NotificationStore] Marking notification as read:', id);
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true 
      })
      .eq('id', id);

    if (error) {
      console.error('[NotificationStore] Error marking notification as read:', error);
      throw error;
    }

    console.log('[NotificationStore] Successfully marked as read:', id);
    this.notifySubscribers();
  }

  async markAllRead(roleTarget: RoleTarget): Promise<void> {
    console.log('[NotificationStore] Marking all as read for role:', roleTarget);
    
    // @ts-ignore - Supabase type chain issue
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('role_target', roleTarget)
      .eq('is_read', false);

    if (error) {
      console.error('[NotificationStore] Error marking all as read:', error);
      throw error;
    }

    console.log('[NotificationStore] Successfully marked all as read for:', roleTarget);
    this.notifySubscribers();
  }

  async archive(id: string): Promise<void> {
    // Archive means delete for now - we can add archived status later if needed
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }

    this.notifySubscribers();
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }

    this.notifySubscribers();
  }

  async clear(isRead?: boolean): Promise<void> {
    const deleteQuery = supabase.from('notifications').delete();
    
    const { error } = await (isRead !== undefined
      ? deleteQuery.eq('is_read', isRead)
      : deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000'));

    if (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }

    this.notifySubscribers();
  }

  async deleteRead(roleTarget: RoleTarget): Promise<void> {
    const { error } = await (supabase
      .from('notifications')
      .delete()
      .eq('role_target', roleTarget)
      .eq('is_read', true) as any);

    if (error) {
      console.error('Error deleting read notifications:', error);
      throw error;
    }

    this.notifySubscribers();
  }

  getStats(roleTarget: RoleTarget): {
    total: number;
    unread: number;
    read: number;
  } {
    // For backward compatibility, return zeros
    // Use getStatsAsync() for real data
    console.warn('notificationStore.getStats() is synchronous fallback. Use getStatsAsync() for real data.');
    return { total: 0, unread: 0, read: 0 };
  }

  async getStatsAsync(roleTarget: RoleTarget): Promise<{
    total: number;
    unread: number;
    read: number;
  }> {
    const { data, error } = await supabase
      .from('notifications')
      .select('is_read')
      .eq('role_target', roleTarget);

    if (error) {
      console.error('Error getting stats:', error);
      return { total: 0, unread: 0, read: 0 };
    }

    const total = data?.length || 0;
    const unread = data?.filter((n: any) => !n.is_read).length || 0;
    const read = data?.filter((n: any) => n.is_read).length || 0;

    return { total, unread, read };
  }
}

export const notificationStore = new NotificationStore();

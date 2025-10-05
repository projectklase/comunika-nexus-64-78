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

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';
export type RoleTarget = 'SECRETARIA' | 'PROFESSOR' | 'ALUNO';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  roleTarget: RoleTarget;
  status: NotificationStatus;
  createdAt: string;
  link?: string;
  meta?: Record<string, any>;
  userId: string;
}

interface NotificationFilters {
  status?: NotificationStatus;
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
    status: row.status,
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
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.roleTarget) {
      query = query.eq('role_target', filters.roleTarget);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error listing notifications:', error);
      throw error;
    }

    return (data || []).map(dbRowToNotification);
  }

  async add(notification: Omit<Notification, 'id' | 'createdAt' | 'status' | 'userId'> & { roleTarget: RoleTarget; userId?: string }): Promise<Notification> {
    // Try to infer userId from meta if not provided
    const userId = notification.userId || 
                   notification.meta?.studentId || 
                   notification.meta?.userId || 
                   '00000000-0000-0000-0000-000000000000'; // Fallback for system notifications
    
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
        status: 'UNREAD',
        is_read: false
      } as any) // Type cast to avoid TypeScript issues with status column
      .select()
      .single();

    if (error) {
      console.error('Error adding notification:', error);
      throw error;
    }

    this.notifySubscribers();
    return dbRowToNotification(data);
  }

  async markRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        status: 'READ',
        is_read: true 
      })
      .eq('id', id);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }

    this.notifySubscribers();
  }

  async markAllRead(roleTarget: RoleTarget): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        status: 'READ',
        is_read: true 
      })
      .eq('role_target', roleTarget)
      .eq('status', 'UNREAD');

    if (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }

    this.notifySubscribers();
  }

  async archive(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'ARCHIVED' })
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

  async clear(status?: NotificationStatus): Promise<void> {
    let query = supabase.from('notifications').delete();
    
    if (status) {
      query = query.eq('status', status);
    } else {
      // If no status specified, delete all
      query = query.neq('id', '00000000-0000-0000-0000-000000000000'); // Match all
    }

    const { error } = await query;

    if (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }

    this.notifySubscribers();
  }

  async deleteRead(roleTarget: RoleTarget): Promise<void> {
    const { error} = await supabase
      .from('notifications')
      .delete()
      .eq('role_target', roleTarget)
      .eq('status', 'READ');

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
    archived: number;
  } {
    // For backward compatibility, return zeros
    // Use getStatsAsync() for real data
    console.warn('notificationStore.getStats() is synchronous fallback. Use getStatsAsync() for real data.');
    return { total: 0, unread: 0, read: 0, archived: 0 };
  }

  async getStatsAsync(roleTarget: RoleTarget): Promise<{
    total: number;
    unread: number;
    read: number;
    archived: number;
  }> {
    const { data, error } = await supabase
      .from('notifications')
      .select('status, is_read')
      .eq('role_target', roleTarget);

    if (error) {
      console.error('Error getting stats:', error);
      return { total: 0, unread: 0, read: 0, archived: 0 };
    }

    const total = data?.length || 0;
    const unread = data?.filter((n: any) => n.status === 'UNREAD' || !n.is_read).length || 0;
    const read = data?.filter((n: any) => n.status === 'READ' || n.is_read).length || 0;
    const archived = data?.filter((n: any) => n.status === 'ARCHIVED').length || 0;

    return { total, unread, read, archived };
  }
}

export const notificationStore = new NotificationStore();

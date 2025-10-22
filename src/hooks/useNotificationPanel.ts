import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationStore, Notification, RoleTarget } from '@/stores/notification-store';
import { initializeHolidayNotifications } from '@/utils/holiday-notifications-enhanced';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPanelState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
}

/**
 * Hook for managing unified notification panel
 */
export function useNotificationPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Get user's role target
  const roleTarget: RoleTarget | null = useMemo(() => {
    if (!user) return null;
    
    switch (user.role) {
      case 'secretaria': return 'SECRETARIA';
      case 'professor': return 'PROFESSOR';
      case 'aluno': return 'ALUNO';
      default: return null;
    }
  }, [user]);
  
  // Initialize notifications for user (only once per session)
  useEffect(() => {
    if (user && roleTarget) {
      const key = `holiday_notifications_initialized_${user.id}`;
      const initialized = sessionStorage.getItem(key);
      
      if (!initialized) {
        initializeHolidayNotifications(user.id, roleTarget);
        sessionStorage.setItem(key, 'true');
      }
    }
  }, [user?.id, roleTarget]);
  
  // Load notifications from store
  const loadNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    
    console.log('[useNotificationPanel] 🔄 Loading notifications for user:', user.id, 'with role:', roleTarget);
    
    const allNotifications = await notificationStore.listAsync({
      userId: user.id,
      limit: 100
    });
    
    // Sort by date (most recent first)
    const sorted = allNotifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    console.log('[useNotificationPanel] ✅ Loaded', sorted.length, 'notifications');
    
    setNotifications(sorted);
    setLoading(false);
  };
  
  // Subscribe to store changes
  useEffect(() => {
    if (!roleTarget || !user?.id) return;
    
    console.log('[useNotificationPanel] 🔔 Setting up subscription for user:', user.id);
    
    loadNotifications();
    
    const unsubscribe = notificationStore.subscribe(() => {
      console.log('[useNotificationPanel] 🔄 Store changed, reloading notifications');
      loadNotifications();
    });
    
    return () => {
      console.log('[useNotificationPanel] 🔕 Unsubscribing from notification updates');
      unsubscribe();
    };
  }, [roleTarget, user?.id]);
  
  // Auto-cleanup: Delete read notifications older than 7 days
  useEffect(() => {
    if (!roleTarget || !user) return;
    
    const cleanupOldReadNotifications = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const allNotifications = await notificationStore.listAsync({
          roleTarget,
          userId: user.id
        });
        
        const oldReadNotifications = allNotifications.filter(n => {
          const isRead = n.isRead;
          const isOld = new Date(n.createdAt) < sevenDaysAgo;
          return isRead && isOld;
        });
        
        if (oldReadNotifications.length > 0) {
          console.log(`[NotificationPanel] Auto-cleaning ${oldReadNotifications.length} old read notifications`);
          await Promise.all(
            oldReadNotifications.map(n => notificationStore.delete(n.id))
          );
        }
      } catch (error) {
        console.error('[NotificationPanel] Error cleaning old notifications:', error);
      }
    };
    
    cleanupOldReadNotifications();
    const cleanupInterval = setInterval(cleanupOldReadNotifications, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(cleanupInterval);
  }, [roleTarget, user?.id]);
  
  // Calculate unread count
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length,
    [notifications]
  );
  
  const markAsRead = async (notificationId: string) => {
    console.log('[useNotificationPanel] markAsRead called for:', notificationId);
    try {
      await notificationStore.markRead(notificationId);
      await loadNotifications();
      console.log('[useNotificationPanel] markAsRead completed successfully');
    } catch (error) {
      console.error('[useNotificationPanel] Error marking notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    if (!roleTarget || !user) {
      console.warn('[useNotificationPanel] markAllAsRead called without roleTarget or user');
      return;
    }
    
    console.log('[useNotificationPanel] markAllAsRead called for roleTarget:', roleTarget);
    
    try {
      await notificationStore.markAllRead(roleTarget);
      
      toast({
        title: 'Todas marcadas como lidas',
        description: `${unreadCount} notificações foram marcadas como lidas.`
      });
      
      await loadNotifications();
      console.log('[useNotificationPanel] markAllAsRead completed successfully');
    } catch (error) {
      console.error('[useNotificationPanel] Error marking notifications as read:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar as notificações como lidas.',
        variant: 'destructive'
      });
    }
  };
  
  const archiveNotification = async (notificationId: string) => {
    try {
      await notificationStore.archive(notificationId);
      await loadNotifications();
      
      toast({
        title: 'Notificação arquivada',
        description: 'A notificação foi movida para o arquivo.'
      });
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível arquivar a notificação.',
        variant: 'destructive'
      });
    }
  };
  
  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationStore.delete(notificationId);
      await loadNotifications();
      
      toast({
        title: 'Notificação removida',
        description: 'A notificação foi removida permanentemente.'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a notificação.',
        variant: 'destructive'
      });
    }
  };
  
  const hideNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };
  
  return {
    // State
    state: {
      notifications,
      unreadCount,
      loading
    } as NotificationPanelState,
    
    // Actions
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    hideNotification,
    
    // Computed
    hasNotifications: notifications.length > 0,
    hasUnread: unreadCount > 0
  };
}
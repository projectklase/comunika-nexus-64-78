import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationStore, Notification, RoleTarget } from '@/stores/notification-store';
import { initializeHolidayNotifications } from '@/utils/holiday-notifications-enhanced';
import { useToast } from '@/hooks/use-toast';

export type NotificationTab = 'novidades' | 'importantes';

export interface NotificationPanelState {
  notifications: {
    novidades: Notification[];
    importantes: Notification[];
  };
  unreadCounts: {
    novidades: number;
    importantes: number;
    total: number;
  };
  activeTab: NotificationTab;
  loading: boolean;
}

/**
 * Hook for managing the notification panel with Lovable-style tabs
 */
export function useNotificationPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<NotificationTab>('novidades');
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
  }, [user?.id, roleTarget]); // Only depend on user.id, not full user object
  
  // Load notifications from store
  const loadNotifications = async () => {
    if (!roleTarget) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    
    const allNotifications = await notificationStore.listAsync({
      roleTarget,
      limit: 100
    });
    
    setNotifications(allNotifications);
    setLoading(false);
  };
  
  // Subscribe to store changes (only once)
  useEffect(() => {
    if (!roleTarget) return;
    
    loadNotifications();
    
    const unsubscribe = notificationStore.subscribe(() => {
      // Debounce rapid changes
      const timeoutId = setTimeout(() => {
        loadNotifications();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    });
    
    return unsubscribe;
  }, [roleTarget]); // Only depend on roleTarget
  
  // Auto-cleanup: Delete read notifications older than 7 days (like Instagram/Facebook)
  useEffect(() => {
    if (!roleTarget || !user) return;
    
    const cleanupOldReadNotifications = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // Get all read notifications older than 7 days
        const allNotifications = await notificationStore.listAsync({
          roleTarget,
          userId: user.id
        });
        
        const oldReadNotifications = allNotifications.filter(n => {
          const isRead = n.status === 'READ';
          const isOld = new Date(n.createdAt) < sevenDaysAgo;
          return isRead && isOld;
        });
        
        // Delete old read notifications
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
    
    // Run cleanup on mount
    cleanupOldReadNotifications();
    
    // Run cleanup daily
    const cleanupInterval = setInterval(cleanupOldReadNotifications, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(cleanupInterval);
  }, [roleTarget, user?.id]);
  
  // Categorize notifications into tabs
  const categorizedNotifications = useMemo(() => {
    const importantes: Notification[] = [];
    const novidades: Notification[] = [];
    
    notifications.forEach(notification => {
      // Importantes: posts marked as important + holidays
      if (
        notification.type === 'POST_IMPORTANT' || 
        notification.type === 'HOLIDAY' ||
        notification.meta?.important === true
      ) {
        importantes.push(notification);
      } else {
        // Novidades: all other new/relevant content
        novidades.push(notification);
      }
    });
    
    return {
      importantes: importantes.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      novidades: novidades.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    };
  }, [notifications]);
  
  // Calculate unread counts
  const unreadCounts = useMemo(() => {
    const importantesUnread = categorizedNotifications.importantes.filter(n => n.status === 'UNREAD').length;
    const novidadesUnread = categorizedNotifications.novidades.filter(n => n.status === 'UNREAD').length;
    
    return {
      importantes: importantesUnread,
      novidades: novidadesUnread,
      total: importantesUnread + novidadesUnread
    };
  }, [categorizedNotifications]);
  
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
  
  const markAllAsRead = async (tab?: NotificationTab) => {
    if (!roleTarget || !user) {
      console.warn('[useNotificationPanel] markAllAsRead called without roleTarget or user');
      return;
    }
    
    console.log('[useNotificationPanel] markAllAsRead called for tab:', tab, 'roleTarget:', roleTarget);
    
    try {
      if (tab) {
        // Mark specific tab as read
        const tabNotifications = categorizedNotifications[tab];
        console.log('[useNotificationPanel] Marking', tabNotifications.length, 'notifications in tab:', tab);
        
        await Promise.all(
          tabNotifications
            .filter(n => n.status === 'UNREAD')
            .map(n => notificationStore.markRead(n.id))
        );
        
        toast({
          title: 'Marcadas como lidas',
          description: `Todas as notificações de ${tab === 'importantes' ? 'Importantes' : 'Novidades'} foram marcadas como lidas.`
        });
      } else {
        console.log('[useNotificationPanel] Marking ALL notifications as read for roleTarget:', roleTarget);
        
        // Mark all as read using the async store method
        await notificationStore.markAllRead(roleTarget);
        
        toast({
          title: 'Todas marcadas como lidas',
          description: `${unreadCounts.total} notificações foram marcadas como lidas.`
        });
      }
      
      // Refresh notifications
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
    // Hide permanently removes the notification
    await deleteNotification(notificationId);
  };
  
  return {
    // State
    state: {
      notifications: categorizedNotifications,
      unreadCounts,
      activeTab,
      loading
    } as NotificationPanelState,
    
    // Actions
    setActiveTab,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    hideNotification,
    
    // Computed
    hasNotifications: notifications.length > 0,
    hasUnread: unreadCounts.total > 0
  };
}
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
  
  // Initialize notifications for user
  useEffect(() => {
    if (user && roleTarget) {
      initializeHolidayNotifications(user.id, roleTarget);
    }
  }, [user, roleTarget]);
  
  // Load notifications from store
  const loadNotifications = () => {
    if (!roleTarget) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    
    const allNotifications = notificationStore.list({
      roleTarget,
      limit: 100
    });
    
    setNotifications(allNotifications);
    setLoading(false);
  };
  
  // Subscribe to store changes
  useEffect(() => {
    loadNotifications();
    
    const unsubscribe = notificationStore.subscribe(() => {
      loadNotifications();
    });
    
    return unsubscribe;
  }, [roleTarget]);
  
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
  
  // Actions
  const markAsRead = (notificationId: string) => {
    notificationStore.markRead(notificationId);
  };
  
  const markAllAsRead = (tab?: NotificationTab) => {
    if (!roleTarget) return;
    
    if (tab) {
      // Mark specific tab as read
      const tabNotifications = categorizedNotifications[tab];
      tabNotifications.forEach(notification => {
        if (notification.status === 'UNREAD') {
          notificationStore.markRead(notification.id);
        }
      });
      
      toast({
        title: 'Marcadas como lidas',
        description: `Todas as notificações de ${tab === 'importantes' ? 'Importantes' : 'Novidades'} foram marcadas como lidas.`
      });
    } else {
      // Mark all as read
      notificationStore.markAllRead(roleTarget);
      
      toast({
        title: 'Todas marcadas como lidas',
        description: `${unreadCounts.total} notificações foram marcadas como lidas.`
      });
    }
  };
  
  const archiveNotification = (notificationId: string) => {
    notificationStore.archive(notificationId);
    
    toast({
      title: 'Notificação arquivada',
      description: 'A notificação foi movida para o arquivo.'
    });
  };
  
  const deleteNotification = (notificationId: string) => {
    notificationStore.delete(notificationId);
    
    toast({
      title: 'Notificação removida',
      description: 'A notificação foi removida permanentemente.'
    });
  };
  
  const hideNotification = (notificationId: string) => {
    // Hide is the same as archive in our system
    archiveNotification(notificationId);
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
import { useState, useEffect } from 'react';
import { notificationService } from '@/services/notification-service';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  meta?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar notificações
  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const [notificationsList, count] = await Promise.all([
        notificationService.list(user.id),
        notificationService.countUnread(user.id)
      ]);
      
      setNotifications(notificationsList);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Marcar como lida
  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Deletar notificação
  const deleteNotification = async (id: string) => {
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Recalcular unread count
      if (user) {
        const count = await notificationService.countUnread(user.id);
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Configurar realtime
  useEffect(() => {
    if (!user) return;

    let channel: any;

    const setupRealtime = () => {
      channel = notificationService.subscribeToNotifications(user.id, (notification) => {
        setNotifications(prev => [notification, ...prev]);
        if (!notification.isRead) {
          setUnreadCount(prev => prev + 1);
        }
      });
    };

    setupRealtime();
    loadNotifications();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications
  };
}
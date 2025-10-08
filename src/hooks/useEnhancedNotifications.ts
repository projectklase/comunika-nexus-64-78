import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationStore, type Notification, type RoleTarget, type NotificationType } from '@/stores/notification-store';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationSound {
  high: { play: () => void };
  medium: { play: () => void };
  low: { play: () => void };
}

export interface NotificationPreferences {
  soundEnabled: boolean;
  pushEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  priority: 'all' | 'high' | 'medium';
  categories: string[];
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  pushEnabled: true,
  autoRefresh: true,
  refreshInterval: 30,
  priority: 'all',
  categories: ['RESET_REQUESTED', 'RESET_IN_PROGRESS', 'RESET_COMPLETED', 'RESET_CANCELLED']
};

export const useEnhancedNotifications = (roleTarget?: RoleTarget) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const soundsRef = useRef<NotificationSound | null>(null);
  const lastNotificationCount = useRef<number>(0);

  // Initialize notification sounds (using frequency-based sounds for better compatibility)
  useEffect(() => {
    if (preferences.soundEnabled) {
      try {
        const createBeep = (frequency: number, duration: number = 200) => {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
          
          return {
            play: () => {
              const newOscillator = audioContext.createOscillator();
              const newGain = audioContext.createGain();
              
              newOscillator.connect(newGain);
              newGain.connect(audioContext.destination);
              
              newOscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
              newOscillator.type = 'sine';
              
              newGain.gain.setValueAtTime(0.3, audioContext.currentTime);
              newGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
              
              newOscillator.start(audioContext.currentTime);
              newOscillator.stop(audioContext.currentTime + duration / 1000);
            }
          };
        };

        soundsRef.current = {
          high: createBeep(800, 300), // Higher pitch, longer duration for high priority
          medium: createBeep(600, 200), // Medium pitch
          low: createBeep(400, 150) // Lower pitch, shorter duration
        };
      } catch (error) {
        console.warn('Failed to initialize notification sounds:', error);
        // Fallback to silent mode
        soundsRef.current = {
          high: { play: () => {} },
          medium: { play: () => {} },
          low: { play: () => {} }
        };
      }
    }
  }, [preferences.soundEnabled]);

  // Load preferences from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('comunika.notification_preferences');
    if (stored) {
      try {
        const parsedPrefs = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsedPrefs });
      } catch (error) {
        console.warn('Failed to load notification preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  const updatePreferences = useCallback((newPrefs: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    localStorage.setItem('comunika.notification_preferences', JSON.stringify(updated));
  }, [preferences]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notificações não suportadas',
        description: 'Seu navegador não suporte notificações push.',
        variant: 'destructive'
      });
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      toast({
        title: 'Notificações bloqueadas',
        description: 'Ative as notificações nas configurações do navegador.',
        variant: 'destructive'
      });
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, [toast]);

  // Play notification sound
  const playNotificationSound = useCallback((priority: 'high' | 'medium' | 'low' = 'medium') => {
    if (!preferences.soundEnabled || !soundsRef.current) return;
    
    try {
      const sound = soundsRef.current[priority];
      sound.play();
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }, [preferences.soundEnabled]);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if (!preferences.pushEnabled || Notification.permission !== 'granted') return;

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.type === 'RESET_REQUESTED'
      });

      browserNotification.onclick = () => {
        window.focus();
        notificationStore.markRead(notification.id);
        if (notification.link && window.location.pathname !== notification.link) {
          window.location.href = notification.link;
        }
        browserNotification.close();
      };

      // Auto close after 8 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 8000);
    } catch (error) {
      console.warn('Failed to show browser notification:', error);
    }
  }, [preferences.pushEnabled]);

  // Get notification priority
  const getNotificationPriority = (notification: Notification): 'high' | 'medium' | 'low' => {
    switch (notification.type) {
      case 'RESET_REQUESTED':
        return 'high';
      case 'RESET_IN_PROGRESS':
      case 'RESET_COMPLETED':
        return 'medium';
      default:
        return 'low';
    }
  };

  // Update notifications with ref to prevent infinite loops
  const updateNotifications = useCallback(() => {
    if (!user || (roleTarget && user.role.toUpperCase() !== roleTarget)) return;

    const target = roleTarget || user.role.toUpperCase() as RoleTarget;
    const latest = notificationStore.list({ roleTarget: target });
    
    // Check for new notifications
    const newCount = latest.filter(n => n.status === 'UNREAD').length;
    if (newCount > lastNotificationCount.current) {
      const newNotifications = latest
        .filter(n => n.status === 'UNREAD')
        .slice(0, newCount - lastNotificationCount.current);
      
      newNotifications.forEach(notification => {
        const priority = getNotificationPriority(notification);
        
        // Play sound
        if (preferences.soundEnabled && soundsRef.current) {
          const sound = soundsRef.current[priority];
          sound.play();
        }
        
        // Show browser notification
        if (preferences.pushEnabled && Notification.permission === 'granted') {
          try {
            const browserNotification = new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: notification.id,
              requireInteraction: notification.type === 'RESET_REQUESTED'
            });

            browserNotification.onclick = () => {
              window.focus();
              notificationStore.markRead(notification.id);
              if (notification.link && window.location.pathname !== notification.link) {
                window.location.href = notification.link;
              }
              browserNotification.close();
            };

            setTimeout(() => browserNotification.close(), 8000);
          } catch (error) {
            console.warn('Failed to show browser notification:', error);
          }
        }
        
        // Show toast for very recent notifications
        const isVeryRecent = Date.now() - new Date(notification.createdAt).getTime() < 5000;
        if (isVeryRecent) {
          toast({
            title: notification.title,
            description: notification.message,
            duration: priority === 'high' ? 8000 : 5000,
          });
        }
      });
    }
    
    lastNotificationCount.current = newCount;
    setNotifications(latest);
    setLastCheck(new Date());
  }, [user, roleTarget, preferences.soundEnabled, preferences.pushEnabled, toast]);

  // Auto-refresh notifications
  useEffect(() => {
    if (!preferences.autoRefresh || !isOnline) return;

    updateNotifications(); // Initial load
    
    intervalRef.current = setInterval(() => {
      updateNotifications();
    }, preferences.refreshInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [preferences.autoRefresh, preferences.refreshInterval, isOnline, updateNotifications]);

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updateNotifications(); // Refresh when coming back online
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateNotifications]);

  // Subscribe to notification store changes (only once)
  useEffect(() => {
    if (!user) return;
    
    const handleStoreChange = () => {
      // Use a ref to prevent calling updateNotifications if already scheduled
      if (intervalRef.current) return; // Skip if auto-refresh is active
      updateNotifications();
    };
    
    const unsubscribe = notificationStore.subscribe(handleStoreChange);
    return unsubscribe;
  }, [user]); // Only depend on user

  // Manual refresh
  const refresh = useCallback(() => {
    updateNotifications();
  }, [updateNotifications]);

  // Get stats
  const stats = useCallback(() => {
    if (!user) return { total: 0, unread: 0, read: 0, archived: 0 };
    const target = roleTarget || user.role.toUpperCase() as RoleTarget;
    return notificationStore.getStats(target);
  }, [user, roleTarget]);

  // Filter notifications
  const getFilteredNotifications = useCallback((filters?: {
    status?: 'UNREAD' | 'READ' | 'ARCHIVED';
    type?: NotificationType;
    search?: string;
    limit?: number;
  }) => {
    if (!user) return [];
    
    const target = roleTarget || user.role.toUpperCase() as RoleTarget;
    return notificationStore.list({
      roleTarget: target,
      status: filters?.status,
      type: filters?.type,
      search: filters?.search,
      limit: filters?.limit
    });
  }, [user, roleTarget]);

  return {
    notifications,
    preferences,
    updatePreferences,
    requestNotificationPermission,
    refresh,
    stats,
    getFilteredNotifications,
    isOnline,
    lastCheck,
    // Utility functions
    markRead: (id: string) => notificationStore.markRead(id),
    markAllRead: () => {
      if (user) {
        const target = roleTarget || user.role.toUpperCase() as RoleTarget;
        notificationStore.markAllRead(target);
      }
    },
    archive: (id: string) => notificationStore.archive(id),
    clear: (status?: 'UNREAD' | 'READ' | 'ARCHIVED') => notificationStore.clear(status),
    deleteRead: () => {
      if (user) {
        const target = roleTarget || user.role.toUpperCase() as RoleTarget;
        notificationStore.deleteRead(target);
      }
    },
    delete: (id: string) => notificationStore.delete(id),
  };
};
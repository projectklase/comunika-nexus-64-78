/**
 * Real-time Notifications Hook
 * Listens to new notifications via Supabase Realtime and displays toast alerts
 */

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { notificationStore } from '@/stores/notification-store';
import { useToast } from '@/hooks/use-toast';
import { Bell, AlertCircle, Calendar, Award, FileText, Users } from 'lucide-react';

// Map notification types to icons and styles
const getNotificationConfig = (type: string) => {
  const configs: Record<string, { icon: any; variant?: 'default' | 'destructive' }> = {
    POST_AVISO: { icon: Bell },
    POST_COMUNICADO: { icon: Bell },
    POST_ATIVIDADE: { icon: FileText },
    POST_TRABALHO: { icon: FileText },
    POST_PROVA: { icon: AlertCircle, variant: 'destructive' },
    POST_EVENTO: { icon: Calendar },
    KOIN_BONUS: { icon: Award },
    EVENT_INVITATION: { icon: Users },
    DEFAULT: { icon: Bell }
  };

  return configs[type] || configs.DEFAULT;
};

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    console.log('[Realtime] Subscribing to notifications for user:', user.id);

    // Subscribe to INSERT events on notifications table filtered by user_id
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Realtime] New notification received:', payload);
          
          const notification = payload.new as any;
          
          // Get notification configuration
          const config = getNotificationConfig(notification.type);

          // Display toast
          toast({
            title: notification.title,
            description: notification.message,
            variant: config.variant,
            duration: 5000,
          });

          // The notification panel will auto-update via its subscription to notificationStore
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('[Realtime] Unsubscribing from notifications');
      supabase.removeChannel(channel);
    };
  }, [user, toast]);
}

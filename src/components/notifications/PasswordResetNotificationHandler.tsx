/**
 * Password Reset Notification Handler
 * Handles internal password reset notifications for secretaria
 */

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { passwordResetStore } from '@/stores/password-reset-store';
import { notificationStore } from '@/stores/notification-store';
import { useToast } from '@/hooks/use-toast';

export function PasswordResetNotificationHandler() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || user.role !== 'secretaria') return;

    const unsubscribe = notificationStore.subscribe(async () => {
      const newNotifications = await notificationStore.listAsync({
        roleTarget: 'SECRETARIA',
        status: 'UNREAD',
        limit: 1
      });

      const latestNotification = newNotifications[0];
      if (latestNotification && latestNotification.type.includes('RESET')) {
        toast({
          title: latestNotification.title,
          description: latestNotification.message,
          action: latestNotification.link ? (
            <button
              onClick={() => window.open(latestNotification.link, '_self')}
              className="text-sm underline"
            >
              Ver detalhes
            </button>
          ) : undefined,
        });
      }
    });

    return unsubscribe;
  }, [user, toast]);

  return null;
}
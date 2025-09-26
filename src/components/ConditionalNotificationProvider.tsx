import React, { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

interface ConditionalNotificationProviderProps {
  children: React.ReactNode;
}

/**
 * Wrapper that only renders NotificationProvider when auth is fully initialized
 * This prevents the "useAuth must be used within an AuthProvider" error
 */
export function ConditionalNotificationProvider({ children }: ConditionalNotificationProviderProps) {
  // Access the context directly instead of using the hook to avoid throwing errors
  const authContext = useContext(AuthContext);
  
  // If auth context is not available or still loading, render children without NotificationProvider
  if (!authContext || authContext.isLoading) {
    return <>{children}</>;
  }
  
  // Auth is available and loaded, render with NotificationProvider
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}
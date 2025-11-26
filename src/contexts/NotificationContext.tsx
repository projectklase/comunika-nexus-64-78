import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationPanel } from '@/hooks/useNotificationPanel';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface NotificationContextType {
  // State
  isOpen: boolean;
  
  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  
  // Data from panel hook
  panelData: ReturnType<typeof useNotificationPanel>;
  
  // Focus management
  focusRef: React.RefObject<HTMLElement | null>;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const focusRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  
  // Get panel data from hook
  const panelData = useNotificationPanel();
  
  // Enable real-time notifications
  useRealtimeNotifications();
  
  // Actions
  const open = () => {
    // Store current focus to return later
    returnFocusRef.current = document.activeElement as HTMLElement;
    setIsOpen(true);
  };
  
  const close = () => {
    setIsOpen(false);
    
    // Return focus to the element that opened the panel
    setTimeout(() => {
      if (returnFocusRef.current) {
        returnFocusRef.current.focus();
        returnFocusRef.current = null;
      }
    }, 100);
  };
  
  const toggle = () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  };
  
  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);
  
  // Focus management when panel opens
  useEffect(() => {
    if (isOpen && focusRef.current) {
      // Focus the first interactive element in the panel
      const firstFocusable = focusRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 150);
      }
    }
  }, [isOpen]);
  
  // Close when user logs out
  useEffect(() => {
    if (!user) {
      setIsOpen(false);
    }
  }, [user]);
  
  const value: NotificationContextType = {
    isOpen,
    open,
    close,
    toggle,
    panelData,
    focusRef,
    returnFocusRef
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextType {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  
  return context;
}
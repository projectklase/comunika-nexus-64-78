/**
 * Modal Manager - Centralized modal state management with z-index control
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface ModalEntry {
  id: string;
  priority: number;
  canClose: boolean;
}

interface ModalManagerContextType {
  registerModal: (id: string, priority?: number) => void;
  unregisterModal: (id: string) => void;
  isTopModal: (id: string) => boolean;
  getTopModalId: () => string | null;
  modals: ModalEntry[];
  lockScroll: () => void;
  unlockScroll: () => void;
}

const ModalManagerContext = createContext<ModalManagerContextType | null>(null);

export function ModalManagerProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<ModalEntry[]>([]);
  const [scrollLockCount, setScrollLockCount] = useState(0);

  // Register a modal in the stack
  const registerModal = useCallback((id: string, priority: number = 100) => {
    setModals(prev => {
      // Remove if already exists to avoid duplicates
      const filtered = prev.filter(m => m.id !== id);
      return [...filtered, { id, priority, canClose: true }].sort((a, b) => a.priority - b.priority);
    });
  }, []);

  // Unregister a modal from the stack
  const unregisterModal = useCallback((id: string) => {
    setModals(prev => prev.filter(m => m.id !== id));
  }, []);

  // Check if modal is top-most
  const isTopModal = useCallback((id: string) => {
    if (modals.length === 0) return false;
    return modals[modals.length - 1].id === id;
  }, [modals]);

  // Get top modal ID
  const getTopModalId = useCallback(() => {
    if (modals.length === 0) return null;
    return modals[modals.length - 1].id;
  }, [modals]);

  // Scroll lock management
  const lockScroll = useCallback(() => {
    setScrollLockCount(prev => {
      const newCount = prev + 1;
      if (newCount === 1) {
        // First lock - save original overflow and lock
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
          document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
      }
      return newCount;
    });
  }, []);

  const unlockScroll = useCallback(() => {
    setScrollLockCount(prev => {
      const newCount = Math.max(0, prev - 1);
      if (newCount === 0) {
        // Last unlock - restore original overflow
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
      return newCount;
    });
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scrollLockCount > 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    };
  }, [scrollLockCount]);

  return (
    <ModalManagerContext.Provider value={{
      registerModal,
      unregisterModal,
      isTopModal,
      getTopModalId,
      modals,
      lockScroll,
      unlockScroll
    }}>
      {children}
    </ModalManagerContext.Provider>
  );
}

export function useModalManager() {
  const context = useContext(ModalManagerContext);
  if (!context) {
    // Return no-ops to prevent crashes
    return {
      registerModal: () => {},
      unregisterModal: () => {},
      isTopModal: () => false,
      getTopModalId: () => null,
      modals: [],
      lockScroll: () => {},
      unlockScroll: () => {}
    } as ModalManagerContextType;
  }
  return context;
}
/**
 * Calendar Modal Manager - Prevents modal conflicts and manages overlay state
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ModalState {
  activeModal: string | null;
  modalData: any;
}

interface CalendarModalContextType {
  activeModal: string | null;
  modalData: any;
  openModal: (modalId: string, data?: any) => void;
  closeModal: (modalId?: string) => void;
  isModalOpen: (modalId: string) => boolean;
}

const CalendarModalContext = createContext<CalendarModalContextType | null>(null);

export function CalendarModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>({
    activeModal: null,
    modalData: null
  });

  const openModal = useCallback((modalId: string, data?: any) => {
    // Close any existing modal first
    setModalState({ activeModal: null, modalData: null });
    
    // Small delay to ensure previous modal is fully closed
    setTimeout(() => {
      setModalState({ activeModal: modalId, modalData: data });
    }, 50);
  }, []);

  const closeModal = useCallback((modalId?: string) => {
    // If specific modal ID provided, only close if it matches
    if (modalId && modalState.activeModal !== modalId) return;
    
    setModalState({ activeModal: null, modalData: null });
  }, [modalState.activeModal]);

  const isModalOpen = useCallback((modalId: string) => {
    return modalState.activeModal === modalId;
  }, [modalState.activeModal]);

  return (
    <CalendarModalContext.Provider value={{
      activeModal: modalState.activeModal,
      modalData: modalState.modalData,
      openModal,
      closeModal,
      isModalOpen
    }}>
      {children}
    </CalendarModalContext.Provider>
  );
}

export function useCalendarModal() {
  const context = useContext(CalendarModalContext);
  if (!context) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Calendar] CalendarModalProvider missing. Returning no-ops to prevent crash.');
    }
    // Fallback for development to prevent crashes
    return {
      activeModal: null,
      modalData: null,
      openModal: () => {},
      closeModal: () => {},
      isModalOpen: () => false
    } as CalendarModalContextType;
  }
  return context;
}

/**
 * Modal IDs - centralized constants
 */
export const MODAL_IDS = {
  DAY_FOCUS: 'dayFocus',
  ACTIVITY_DRAWER: 'activityDrawer', 
  DAY_SUMMARY: 'daySummary',
  POST_COMPOSER: 'postComposer',
  EVENT_DETAIL: 'eventDetail'
} as const;
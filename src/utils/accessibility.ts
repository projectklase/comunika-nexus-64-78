import { useMemo } from 'react';

// Accessibility helper functions
export const a11y = {
  // Ensure minimum color contrast ratios (WCAG AA)
  getContrastRatio: (color1: string, color2: string): number => {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd use a proper color contrast library
    return 4.5; // Placeholder for WCAG AA compliance
  },

  // Validate ARIA attributes
  validateAriaLabel: (element: Element): boolean => {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    return !!(ariaLabel || ariaLabelledBy);
  },

  // Focus management utilities
  focusManagement: {
    // Trap focus within a container (for modals, drawers, etc.)
    trapFocus: (containerElement: HTMLElement) => {
      const focusableElements = containerElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }

        if (e.key === 'Escape') {
          containerElement.dispatchEvent(new CustomEvent('escape'));
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      firstElement?.focus();

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    },

    // Return focus to a specific element
    returnFocus: (element: HTMLElement) => {
      element?.focus();
    },

    // Find next focusable element
    getNextFocusable: (currentElement: HTMLElement): HTMLElement | null => {
      const focusable = Array.from(
        document.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ) as HTMLElement[];
      
      const currentIndex = focusable.indexOf(currentElement);
      return focusable[currentIndex + 1] || focusable[0];
    }
  },

  // Screen reader announcements
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },

  // Keyboard navigation helpers
  keyboard: {
    // Handle arrow key navigation in lists
    handleArrowNavigation: (
      event: KeyboardEvent, 
      items: NodeListOf<HTMLElement>,
      currentIndex: number,
      onSelect?: (index: number) => void
    ) => {
      let newIndex = currentIndex;
      
      switch (event.key) {
        case 'ArrowUp':
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          break;
        case 'ArrowDown':
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = items.length - 1;
          break;
        case 'Enter':
        case ' ':
          onSelect?.(currentIndex);
          return;
        default:
          return;
      }
      
      event.preventDefault();
      items[newIndex]?.focus();
    },

    // Handle escape key
    onEscape: (callback: () => void) => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          callback();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  },

  // Semantic landmark helpers
  landmarks: {
    main: (props: React.HTMLProps<HTMLElement>) => ({
      role: 'main',
      'aria-label': 'Conteúdo principal',
      ...props
    }),
    
    banner: (props: React.HTMLProps<HTMLElement>) => ({
      role: 'banner',
      'aria-label': 'Cabeçalho principal',
      ...props
    }),
    
    navigation: (label: string, props: React.HTMLProps<HTMLElement> = {}) => ({
      role: 'navigation',
      'aria-label': label,
      ...props
    }),
    
    search: (props: React.HTMLProps<HTMLElement> = {}) => ({
      role: 'search',
      'aria-label': 'Formulário de pesquisa',
      ...props
    }),
    
    complementary: (label: string, props: React.HTMLProps<HTMLElement> = {}) => ({
      role: 'complementary',
      'aria-label': label,
      ...props
    })
  },

  // Loading and status helpers
  loading: {
    // Loading state announcements
    announceLoading: (isLoading: boolean, loadingText = 'Carregando...', completedText = 'Carregamento concluído') => {
      if (isLoading) {
        a11y.announce(loadingText, 'polite');
      } else {
        a11y.announce(completedText, 'polite');
      }
    },

    // Progress indicator
    progressProps: (value: number, max: number = 100, label?: string) => ({
      role: 'progressbar',
      'aria-valuenow': value,
      'aria-valuemin': 0,
      'aria-valuemax': max,
      'aria-label': label || `Progresso: ${Math.round((value / max) * 100)}%`
    })
  }
};

// Hook for managing focus within components
export function useFocusManagement() {
  const trapFocus = useMemo(() => a11y.focusManagement.trapFocus, []);
  const returnFocus = useMemo(() => a11y.focusManagement.returnFocus, []);
  
  return {
    trapFocus,
    returnFocus,
    announce: a11y.announce
  };
}

// High contrast mode detection
export function useHighContrast() {
  return useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-contrast: high)').matches;
    }
    return false;
  }, []);
}

// Reduced motion preference detection
export function useReducedMotion() {
  return useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);
}
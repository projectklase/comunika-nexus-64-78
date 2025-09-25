import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useCalendarModal, MODAL_IDS } from '@/components/calendar/CalendarModalManager';
import { format, isValid, parseISO } from 'date-fns';

interface UseCalendarFocusOptions {
  events: any[];
  isLoading?: boolean;
  currentDate: Date;
  maxRetries?: number;
  retryDelay?: number;
}

export function useCalendarFocus({
  events,
  isLoading = false,
  currentDate,
  maxRetries = 3,
  retryDelay = 500
}: UseCalendarFocusOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [hasFocused, setHasFocused] = useState(false);
  const { openModal, isModalOpen } = useCalendarModal();
  const highlightTimeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Get focus parameters from URL
  const getFocusParams = useCallback(() => {
    const dateParam = searchParams.get('date');
    const focusParam = searchParams.get('focus');
    const viewParam = searchParams.get('view') || 'month';
    
    let targetDate: Date | null = null;
    if (dateParam) {
      try {
        const parsed = parseISO(dateParam);
        if (isValid(parsed)) {
          targetDate = parsed;
        }
      } catch {
        // Invalid date, ignore
      }
    }

    return {
      targetDate,
      focusPostId: focusParam,
      targetView: viewParam as 'month' | 'week',
      hasFocusParams: !!(dateParam && focusParam)
    };
  }, [searchParams]);

  // Clear focus parameters from URL
  const clearFocusParams = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('date');
    newParams.delete('focus'); 
    newParams.delete('view');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Apply highlight effect to element
  const applyHighlight = useCallback((element: HTMLElement) => {
    // Clear any existing timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Add highlight class with smooth animation
    element.classList.add('calendar-focus-highlight');
    
    // Remove highlight after 2 seconds
    highlightTimeoutRef.current = setTimeout(() => {
      element.classList.remove('calendar-focus-highlight');
    }, 2000);
  }, []);

  // Check if day has collapsed items (+N indicator)
  const hasCollapsedItems = useCallback((dayElement: HTMLElement): boolean => {
    const overflowIndicator = dayElement.querySelector('[data-overflow-count]');
    return !!overflowIndicator;
  }, []);

  // Scroll to element and apply focus
  const scrollToElement = useCallback((element: HTMLElement, postId: string) => {
    // Scroll into view with smooth animation
    element.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest'
    });

    // Apply highlight effect
    applyHighlight(element);

    // Set focus for accessibility
    setTimeout(() => {
      element.focus({ preventScroll: true });
      
      // Announce to screen readers
      const postTitle = element.querySelector('[data-post-title]')?.textContent || 'Item';
      const announcement = `Navegado para: ${postTitle}`;
      
      // Create aria-live announcement
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.textContent = announcement;
      document.body.appendChild(liveRegion);
      
      setTimeout(() => {
        if (document.body.contains(liveRegion)) {
          document.body.removeChild(liveRegion);
        }
      }, 1000);
    }, 300);

    return true;
  }, [applyHighlight]);

  // Attempt to focus on the target post
  const attemptFocus = useCallback(async () => {
    const { targetDate, focusPostId, hasFocusParams } = getFocusParams();
    
    if (!hasFocusParams || !focusPostId || !targetDate || hasFocused) {
      return;
    }

    // Wait for loading to complete
    if (isLoading) {
      return;
    }

    try {
      // Check if target post exists in events
      const targetEvent = events.find(event => 
        (event.postId === focusPostId || event.id === focusPostId)
      );

      if (!targetEvent) {
        // Post not found in current view, check if we can retry
        if (retryAttempts < maxRetries) {
          setRetryAttempts(prev => prev + 1);
          retryTimeoutRef.current = setTimeout(attemptFocus, retryDelay);
          return;
        }

        // Max retries reached - try to navigate to correct month based on postId
        // This is a fallback when the event is likely in a different month
        const dateParam = searchParams.get('d') || searchParams.get('date');
        if (dateParam) {
          try {
            const targetDate = new Date(dateParam);
            if (targetDate && !isNaN(targetDate.getTime())) {
              // Update the URL to navigate to the correct month/date
              const newParams = new URLSearchParams(window.location.search);
              newParams.set('d', format(targetDate, 'yyyy-MM-dd'));
              
              // Force a navigation to reload the correct month's data
              const currentPath = window.location.pathname;
              window.history.replaceState({}, '', `${currentPath}?${newParams.toString()}`);
              
              // Trigger a page reload to load the correct month's events
              window.location.reload();
              return;
            }
          } catch (error) {
            console.warn('Failed to parse target date for navigation:', error);
          }
        }

        // Final fallback - show error
        toast({
          title: 'Evento não encontrado',
          description: 'O evento pode estar em outro mês ou ter sido removido. Verifique se a data está correta.',
          variant: 'destructive'
        });
        clearFocusParams();
        setHasFocused(true);
        return;
      }

      // First try to find the post element directly in the calendar
      const postElement = document.querySelector(`[data-post-id="${focusPostId}"]`) as HTMLElement;
      
      if (postElement) {
        // Post is visible in calendar - scroll to it
        scrollToElement(postElement, focusPostId);
        clearFocusParams();
        setHasFocused(true);
        return;
      }

      // Post not visible - check if day has collapsed items
      const targetDateStr = format(targetDate, 'yyyy-MM-dd');
      const dayElement = document.querySelector(`[data-calendar-date="${targetDateStr.replace(/-/g, '')}"]`) as HTMLElement;
      
      if (dayElement && hasCollapsedItems(dayElement)) {
        // Day has +N indicator - open DayFocusModal automatically
        if (!isModalOpen(MODAL_IDS.DAY_FOCUS)) {
          openModal(MODAL_IDS.DAY_FOCUS, { 
            date: targetDate,
            focusPostId: focusPostId 
          });
          
          // Wait for modal to open then try to scroll to post inside modal
          setTimeout(() => {
            const modalPostElement = document.querySelector(
              `.day-focus-modal [data-post-id="${focusPostId}"]`
            ) as HTMLElement;
            
            if (modalPostElement) {
              scrollToElement(modalPostElement, focusPostId);
            }
          }, 300);
          
          clearFocusParams();
          setHasFocused(true);
          return;
        }
      }

      // Still not found - try one more time or give up
      if (retryAttempts < maxRetries) {
        setRetryAttempts(prev => prev + 1);
        retryTimeoutRef.current = setTimeout(attemptFocus, retryDelay);
      } else {
        toast({
          title: 'Post não localizado',
          description: 'O item pode ter sido movido ou removido.',
          variant: 'destructive'
        });
        clearFocusParams();
        setHasFocused(true);
      }

    } catch (error) {
      console.error('Error focusing on calendar post:', error);
      clearFocusParams();
      setHasFocused(true);
    }
  }, [
    getFocusParams,
    hasFocused,
    isLoading,
    events,
    retryAttempts,
    maxRetries,
    retryDelay,
    scrollToElement,
    hasCollapsedItems,
    isModalOpen,
    openModal,
    clearFocusParams,
    toast
  ]);

  // Reset state when focus parameters change
  useEffect(() => {
    const { hasFocusParams } = getFocusParams();
    if (hasFocusParams) {
      setHasFocused(false);
      setRetryAttempts(0);
    }
  }, [getFocusParams]);

  // Attempt focus when conditions are ready
  useEffect(() => {
    if (!isLoading && events.length > 0) {
      attemptFocus();
    }
  }, [attemptFocus, isLoading, events.length]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    focusParams: getFocusParams(),
    clearFocusParams,
    hasFocused,
    retryAttempts
  };
}
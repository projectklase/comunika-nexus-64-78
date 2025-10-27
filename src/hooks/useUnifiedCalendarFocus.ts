import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isValid } from 'date-fns';
import { parseYmdLocal, toYmdLocal } from '@/lib/date-helpers';
import { toast } from '@/hooks/use-toast';
import { useDayFocusModal } from './useDayFocusModal';

interface UseUnifiedCalendarFocusOptions {
  events: any[];
  isLoading?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface FocusParams {
  targetDate: Date | null;
  focusId: string | null;
  focusType: 'post' | 'holiday' | null;
  classId: string | null;
  hasFocusParams: boolean;
}

export function useUnifiedCalendarFocus({
  events,
  isLoading = false,
  maxRetries = 3,
  retryDelay = 500
}: UseUnifiedCalendarFocusOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [hasFocused, setHasFocused] = useState(false);
  const { openModal } = useDayFocusModal();
  const highlightTimeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Parse focus parameters from URL
  const getFocusParams = useCallback((): FocusParams => {
    const dateParam = searchParams.get('date') || searchParams.get('d');
    const focusIdParam = searchParams.get('focusId') || searchParams.get('postId');
    const focusTypeParam = searchParams.get('focusType') as 'post' | 'holiday' | null;
    const classIdParam = searchParams.get('classId');
    
    let targetDate: Date | null = null;
    if (dateParam) {
      try {
        const parsed = parseYmdLocal(dateParam);
        if (parsed) {
          targetDate = parsed;
        }
      } catch {
        // Invalid date, ignore
      }
    }

    return {
      targetDate,
      focusId: focusIdParam,
      focusType: focusTypeParam || (focusIdParam ? 'post' : null), // Assume 'post' if focusId exists but focusType is missing
      classId: classIdParam,
      hasFocusParams: !!(dateParam && (focusIdParam || focusTypeParam === 'holiday'))
    };
  }, [searchParams]);

  // Clear focus parameters from URL
  const clearFocusParams = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('date');
    newParams.delete('d');
    newParams.delete('focusId'); 
    newParams.delete('postId');
    newParams.delete('focusType');
    newParams.delete('classId');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Apply highlight effect to element
  const applyHighlight = useCallback((element: HTMLElement) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    element.classList.add('calendar-focus-highlight');
    
    highlightTimeoutRef.current = setTimeout(() => {
      element.classList.remove('calendar-focus-highlight');
    }, 2000);
  }, []);

  // Scroll to element and apply focus
  const scrollToElement = useCallback((element: HTMLElement, focusId: string) => {
    element.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest'
    });

    applyHighlight(element);

    setTimeout(() => {
      element.focus({ preventScroll: true });
      
      const postTitle = element.querySelector('[data-post-title]')?.textContent || 'Item';
      const announcement = `Navegado para: ${postTitle}`;
      
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

  // Attempt to apply focus
  const attemptFocus = useCallback(async () => {
    const { targetDate, focusId, focusType, hasFocusParams } = getFocusParams();
    
    if (!hasFocusParams || hasFocused) {
      return;
    }

    // Wait for loading to complete
    if (isLoading) {
      return;
    }

    try {
      // Handle holiday focus
      if (focusType === 'holiday' && targetDate) {
        // For holidays, open DayFocus modal to show holiday section
        openModal(targetDate, false); // Don't update URL to prevent loops
        
        // Scroll to the date on calendar
        const dateKey = toYmdLocal(targetDate).replace(/-/g, '');
        const dayElement = document.querySelector(`[data-calendar-date="${dateKey}"]`) as HTMLElement;
        
        if (dayElement) {
          scrollToElement(dayElement, 'holiday');
        }
        
        clearFocusParams();
        setHasFocused(true);
        return;
      }

      // Handle post focus
      if (focusType === 'post' && focusId) {
        // Check if target post exists in events
        const targetEvent = events.find(event => 
          (event.postId === focusId || event.id === focusId)
        );

        if (!targetEvent) {
          // Post not found in current view, check if we can retry
          if (retryAttempts < maxRetries) {
            setRetryAttempts(prev => prev + 1);
            retryTimeoutRef.current = setTimeout(attemptFocus, retryDelay);
            return;
          }

          // Max retries reached - try to open DayFocus modal as fallback
          if (targetDate) {
            openModal(targetDate, false);
          }
          
          clearFocusParams();
          setHasFocused(true);
          return;
        }

        // Try to find the post element directly in the calendar
        const postElement = document.querySelector(`[data-post-id="${focusId}"]`) as HTMLElement;
        
        if (postElement) {
          // Post is visible in calendar - scroll to it
          scrollToElement(postElement, focusId);
          clearFocusParams();
          setHasFocused(true);
          return;
        }

        // Post not visible - check if day has collapsed items
        if (targetDate) {
          const dateKey = toYmdLocal(targetDate).replace(/-/g, '');
          const dayElement = document.querySelector(`[data-calendar-date="${dateKey}"]`) as HTMLElement;
          
          if (dayElement) {
            const overflowIndicator = dayElement.querySelector('[data-overflow-count]');
            if (overflowIndicator) {
              // Day has +N indicator - open DayFocusModal
              openModal(targetDate, false);
              
              // Wait for modal to open then try to scroll to post inside modal
              setTimeout(() => {
                const modalPostElement = document.querySelector(
                  `[data-post-id="${focusId}"]`
                ) as HTMLElement;
                
                if (modalPostElement) {
                  scrollToElement(modalPostElement, focusId);
                }
              }, 300);
              
              clearFocusParams();
              setHasFocused(true);
              return;
            }
          }
        }

        // Still not found - retry or give up
        if (retryAttempts < maxRetries) {
          setRetryAttempts(prev => prev + 1);
          retryTimeoutRef.current = setTimeout(attemptFocus, retryDelay);
        } else {
          // Final fallback - just open the day
          if (targetDate) {
            openModal(targetDate, false);
          }
          clearFocusParams();
          setHasFocused(true);
        }
      }

    } catch (error) {
      console.error('Error in calendar focus:', error);
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
    openModal,
    scrollToElement,
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
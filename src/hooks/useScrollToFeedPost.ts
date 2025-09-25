import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface UseScrollToFeedPostOptions {
  posts: any[];
  isLoading?: boolean;
  onFiltersAutoAdjust?: () => void;
}

export function useScrollToFeedPost({
  posts,
  isLoading = false,
  onFiltersAutoAdjust
}: UseScrollToFeedPostOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasScrolled = useRef(false);
  const highlightTimeoutRef = useRef<NodeJS.Timeout>();

  // Get target post ID from URL parameters
  const getTargetPostId = useCallback(() => {
    return searchParams.get('postId');
  }, [searchParams]);

  // Get focus flag from URL
  const shouldFocus = useCallback(() => {
    return searchParams.get('focus') === '1';
  }, [searchParams]);

  // Clear focus parameters
  const clearFocusParams = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('postId');
    newParams.delete('focus');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Apply highlight to element
  const applyHighlight = useCallback((element: HTMLElement) => {
    // Clear any existing timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Add highlight class with ring effect
    element.classList.add('ring-2', 'ring-primary/50', 'ring-offset-2', 'ring-offset-background');
    element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Remove highlight after 3 seconds
    highlightTimeoutRef.current = setTimeout(() => {
      element.classList.remove('ring-2', 'ring-primary/50', 'ring-offset-2', 'ring-offset-background');
    }, 3000);
  }, []);

  // Scroll to specific post
  const scrollToPost = useCallback((postId: string): boolean => {
    const element = document.getElementById(`post-${postId}`) ||
                   document.querySelector(`[data-post-id="${postId}"]`) as HTMLElement;
    
    if (element) {
      // Scroll into view
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
        const title = element.querySelector('[data-post-title]')?.textContent || 
                     element.querySelector('h3, h2, h1')?.textContent || 
                     'Post';
        
        const announcement = `Navegado para: ${title}`;
        
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
    }
    
    return false;
  }, [applyHighlight]);

  // Attempt to scroll to target post
  const attemptScroll = useCallback(() => {
    const targetPostId = getTargetPostId();
    const focus = shouldFocus();
    
    if (!targetPostId || !focus || hasScrolled.current || isLoading) {
      return;
    }

    // Check if target post exists in current posts
    const targetPost = posts.find(post => post.id === targetPostId);
    
    if (targetPost) {
      // Post found - scroll to it
      setTimeout(() => {
        const success = scrollToPost(targetPostId);
        if (success) {
          hasScrolled.current = true;
          clearFocusParams();
        }
      }, 100); // Small delay to ensure DOM is updated
    } else {
      // Post not found - try auto-adjusting filters
      if (onFiltersAutoAdjust && !hasScrolled.current) {
        onFiltersAutoAdjust();
        hasScrolled.current = true; // Prevent multiple attempts
        
        // Show helpful message
        toast({
          title: 'Ajustando filtros',
          description: 'Expandindo filtros para encontrar o item solicitado...'
        });
        
        // Clear focus params after attempting auto-adjust
        setTimeout(() => {
          clearFocusParams();
        }, 2000);
      } else {
        // No auto-adjust available or already tried
        toast({
          title: 'Item não encontrado',
          description: 'O item pode ter sido removido ou você não tem acesso.',
          variant: 'destructive'
        });
        clearFocusParams();
        hasScrolled.current = true;
      }
    }
  }, [
    getTargetPostId,
    shouldFocus,
    isLoading,
    posts,
    scrollToPost,
    onFiltersAutoAdjust,
    clearFocusParams
  ]);

  // Effect to handle scroll attempts
  useEffect(() => {
    if (!isLoading && posts.length > 0) {
      attemptScroll();
    }
  }, [attemptScroll, isLoading, posts.length]);

  // Reset when URL changes
  useEffect(() => {
    const targetPostId = getTargetPostId();
    const focus = shouldFocus();
    if (targetPostId && focus) {
      hasScrolled.current = false;
    }
  }, [getTargetPostId, shouldFocus]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return {
    targetPostId: getTargetPostId(),
    shouldFocus: shouldFocus(),
    clearFocusParams,
    scrollToPost
  };
}
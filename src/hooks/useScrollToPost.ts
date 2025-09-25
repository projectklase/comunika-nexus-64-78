import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePostViews } from '@/stores/post-views.store';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface UseScrollToPostOptions {
  posts: any[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  canLoadMore?: boolean;
  maxLoadAttempts?: number;
}

export function useScrollToPost({
  posts,
  isLoading = false,
  onLoadMore,
  canLoadMore = false,
  maxLoadAttempts = 5
}: UseScrollToPostOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { recordPostView } = usePostViews();
  const [loadAttempts, setLoadAttempts] = useState(0);
  const attemptedFocus = useRef(false);
  const highlightTimeoutRef = useRef<NodeJS.Timeout>();

  // Get target post ID from URL (query param or hash)
  const getTargetPostId = useCallback(() => {
    const focus = searchParams.get('focus');
    const hash = window.location.hash.replace('#post-', '').replace('#', '');
    const sessionTarget = sessionStorage.getItem('feed:focusPostId');
    
    return focus || hash || sessionTarget;
  }, [searchParams]);

  // Clear focus parameters
  const clearFocusParams = useCallback(() => {
    // Clear query param
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('focus');
    setSearchParams(newParams, { replace: true });
    
    // Clear hash
    if (window.location.hash.includes('post-')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    
    // Clear session storage
    sessionStorage.removeItem('feed:focusPostId');
  }, [searchParams, setSearchParams]);

  // Apply highlight to element
  const applyHighlight = useCallback((element: HTMLElement) => {
    // Clear any existing timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // Add highlight class
    element.classList.add('post-focus-highlight');
    
    // Remove highlight after 2 seconds
    highlightTimeoutRef.current = setTimeout(() => {
      element.classList.remove('post-focus-highlight');
    }, 2000);
  }, []);

  // Scroll to specific post
  const scrollToPost = useCallback((postId: string) => {
    const element = document.querySelector(`[data-post-id="${postId}"]`) as HTMLElement;
    
    if (element) {
      // Scroll into view
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      // Apply highlight
      applyHighlight(element);

      // Set focus for accessibility
      setTimeout(() => {
        element.focus();
        
        // Announce to screen readers
        const title = element.querySelector('[data-post-title]')?.textContent || 'Post';
        const announcement = `Navegado para: ${title}`;
        
        // Create and announce via aria-live region
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.textContent = announcement;
        document.body.appendChild(liveRegion);
        
        setTimeout(() => {
          document.body.removeChild(liveRegion);
        }, 1000);
      }, 500);

      return true;
    }
    
    return false;
  }, [applyHighlight]);

  // Attempt to find and scroll to target post
  const attemptScroll = useCallback(() => {
    const targetPostId = getTargetPostId();
    
    if (!targetPostId || attemptedFocus.current) {
      return;
    }

    // Check if target post exists in current posts
    const targetPost = posts.find(post => post.id === targetPostId);
    
    if (targetPost) {
      // Post is in the list, try to scroll to it
      setTimeout(() => {
        const success = scrollToPost(targetPostId);
        if (success) {
          attemptedFocus.current = true;
          // Record view for deep-link access
          if (user) {
            recordPostView(targetPostId, user, 'deep-link', user.classId);
          }
          clearFocusParams();
        }
      }, 100); // Small delay to ensure DOM is updated
    } else if (canLoadMore && loadAttempts < maxLoadAttempts && !isLoading && onLoadMore) {
      // Post not found, try loading more if possible
      setLoadAttempts(prev => prev + 1);
      onLoadMore();
    } else if (loadAttempts >= maxLoadAttempts || !canLoadMore) {
      // Max attempts reached or can't load more
      toast({
        title: 'Post não encontrado',
        description: 'Não foi possível localizar esta publicação.',
        variant: 'destructive'
      });
      clearFocusParams();
      attemptedFocus.current = true;
    }
  }, [
    getTargetPostId,
    posts,
    canLoadMore,
    loadAttempts,
    maxLoadAttempts,
    isLoading,
    onLoadMore,
    scrollToPost,
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
    if (targetPostId) {
      attemptedFocus.current = false;
      setLoadAttempts(0);
    }
  }, [getTargetPostId]);

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
    clearFocusParams,
    scrollToPost
  };
}
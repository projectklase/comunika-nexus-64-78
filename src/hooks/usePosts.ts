import { useState, useEffect, useRef } from 'react';
import { Post, PostFilter } from '@/types/post';
import { postStore } from '@/stores/post-store';

export function usePosts(filter?: PostFilter) {
  const [posts, setPosts] = useState<Post[]>(() => postStore.list(filter));
  const filterRef = useRef(filter);
  
  // Update ref when filter changes
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    // Update posts when dependencies change
    const updatePosts = () => {
      const newPosts = postStore.list(filterRef.current);
      
      // Only update if posts actually changed (comparison by id and key properties)
      setPosts(prevPosts => {
        if (newPosts.length !== prevPosts.length) return newPosts;
        
        const hasChanges = newPosts.some((post, index) => {
          const prevPost = prevPosts[index];
          return !prevPost || 
            prevPost.id !== post.id || 
            prevPost.createdAt !== post.createdAt ||
            prevPost.status !== post.status ||
            prevPost.title !== post.title ||
            prevPost.dueAt !== post.dueAt ||
            prevPost.eventStartAt !== post.eventStartAt ||
            prevPost.eventEndAt !== post.eventEndAt;
        });
        
        return hasChanges ? newPosts : prevPosts;
      });
    };

    // Initial update
    updatePosts();

    // Subscribe to store changes for instant updates
    const unsubscribe = postStore.subscribe(updatePosts);

    // Set up polling to check for changes (including auto-published posts)
    // Reduced frequency since we now have instant updates
    const interval = setInterval(updatePosts, 30000); // Check every 30 seconds for scheduled posts

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [filter]);

  return posts;
}
import { useState, useEffect, useRef } from 'react';
import { Post, PostFilter } from '@/types/post';
import { postStore } from '@/stores/post-store';

export function usePosts(filter?: PostFilter) {
  const [posts, setPosts] = useState<Post[]>([]);
  const filterRef = useRef(filter);
  
  // Update ref when filter changes
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    // Update posts when dependencies change
    const updatePosts = async () => {
      try {
        const newPosts = await postStore.list(filterRef.current);
        
        // Only update if posts actually changed
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
      } catch (error) {
        console.error('Error updating posts:', error);
      }
    };

    // Initial update
    updatePosts();

    // Subscribe to store changes for instant updates
    const unsubscribe = postStore.subscribe(updatePosts);

    // Set up polling to check for changes (including auto-published posts)
    const interval = setInterval(updatePosts, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [filter]);

  return posts;
}
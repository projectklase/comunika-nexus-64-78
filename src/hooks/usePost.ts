import { useState, useEffect } from 'react';
import { Post } from '@/types/post';
import { postStore } from '@/stores/post-store';

export function usePost(postId: string | null) {
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setPost(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get post from store
      const foundPost = postStore.getById(postId);
      
      if (foundPost) {
        setPost(foundPost);
      } else {
        setError('Post não encontrado');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar post');
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  return { post, isLoading, error };
}
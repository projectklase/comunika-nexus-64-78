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

    postStore.getById(postId).then(foundPost => {
      if (foundPost) {
        setPost(foundPost);
      } else {
        setError('Post não encontrado');
      }
      setIsLoading(false);
    }).catch(err => {
      setError(err instanceof Error ? err.message : 'Erro ao carregar post');
      setIsLoading(false);
    });
  }, [postId]);

  return { post, isLoading, error };
}
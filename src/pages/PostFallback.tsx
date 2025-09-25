import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postStore } from '@/stores/post-store';
import { PostLinkBuilder } from '@/utils/post-links';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

/**
 * Fallback route for legacy post links (/post/:id)
 * Resolves the post and redirects to the correct destination
 */
export function PostFallback() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!id || !user) {
      // Redirect to appropriate dashboard if no ID or user
      const fallbackRoute = user?.role === 'aluno' ? '/aluno/feed' : 
                           user?.role === 'professor' ? '/professor/dashboard' : 
                           '/dashboard';
      navigate(fallbackRoute, { replace: true });
      return;
    }

    // Try to find the post
    const post = postStore.getById(id);
    
    if (post) {
      // Post found, redirect to correct destination
      const destinationUrl = PostLinkBuilder.buildPostUrl(post, user.role);
      
      toast({
        title: 'Redirecionando...',
        description: `Abrindo "${post.title}" no ${PostLinkBuilder.getDestinationName(post)}.`,
      });
      
      navigate(destinationUrl, { replace: true });
    } else {
      // Post not found, show error and redirect to feed
      toast({
        title: 'Post não encontrado',
        description: 'O link que você clicou não é mais válido.',
        variant: 'destructive'
      });
      
      const fallbackRoute = user.role === 'aluno' ? '/aluno/feed' : 
                           user.role === 'professor' ? '/professor/atividades' : 
                           '/secretaria/feed';
      
      navigate(fallbackRoute, { replace: true });
    }
  }, [id, user, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Carregando post...</p>
      </div>
    </div>
  );
}
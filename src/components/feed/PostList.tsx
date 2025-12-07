import { useState, useMemo, useCallback, useEffect } from 'react';
import { Post } from '@/types/post';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { a11y, useReducedMotion } from '@/utils/accessibility';
import { useIsMobile } from '@/hooks/use-mobile'; // FASE 2: Detectar mobile
import { FeedLoadingSkeleton } from './FeedLoadingSkeleton';

interface PostListProps {
  posts: Post[];
  isLoading?: boolean;
  canEdit?: boolean;
  onArchive?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
  pageSize?: number;
  onInviteFriend?: (post: Post) => void;
  onViewInvitations?: (post: Post) => void;
}

export function PostList({ posts, isLoading = false, canEdit, onArchive, onDuplicate, onEdit, onDelete, onUpdate, pageSize = 10, onInviteFriend, onViewInvitations }: PostListProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile(); // FASE 2: Detectar mobile para modo compacto
  
  // Memoize pagination calculations
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(posts.length / pageSize);
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    const visiblePosts = posts.slice(startIndex, endIndex);
    
    return { totalPages, visiblePosts };
  }, [posts, currentPage, pageSize]);
  
  const { totalPages, visiblePosts } = paginationData;
  
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);
  
  const goToPrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);
  
  // Reset to first page when posts change and announce updates
  useEffect(() => {
    setCurrentPage(0);
    if (posts.length > 0) {
      a11y.announce(`Lista atualizada com ${posts.length} posts`, 'polite');
    }
  }, [posts.length]);
  
  // Show loading state after all hooks have been called
  if (isLoading) {
    return <FeedLoadingSkeleton />;
  }
  
  if (posts.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12" role="status" aria-live="polite">
        <div className="glass-card p-6 sm:p-8 rounded-xl border border-border/50 max-w-md mx-auto">
          <div className="text-3xl sm:text-4xl mb-3 sm:mb-4" aria-hidden="true">📭</div>
          <h3 className="text-base sm:text-lg font-medium text-foreground mb-1.5 sm:mb-2">
            Nenhum post encontrado
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Não há posts correspondentes aos filtros selecionados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" role="feed" aria-label="Lista de posts">
      {/* FASE 2: Espaçamento menor em mobile */}
      <div className="space-y-3 sm:space-y-4" role="list">
        {visiblePosts.map((post, index) => (
          <div key={post.id} role="listitem">
            <PostCard
              post={post}
              canEdit={canEdit}
              onArchive={onArchive}
              onDuplicate={onDuplicate}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onInviteFriend={onInviteFriend}
              onViewInvitations={onViewInvitations}
              compact={isMobile} // FASE 2: Passa modo compacto para mobile
            />
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <nav 
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4" 
          aria-label="Navegação de páginas"
          role="navigation"
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className="flex items-center gap-1.5 sm:gap-2 min-h-11 px-3 sm:px-4 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground" aria-live="polite">
              <span>{currentPage + 1} de {totalPages}</span>
              <span className="hidden sm:inline" aria-hidden="true">•</span>
              <span className="hidden sm:inline">{posts.length} posts</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-1.5 sm:gap-2 min-h-11 px-3 sm:px-4 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Próxima página"
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
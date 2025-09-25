import { useState, useMemo, useCallback, useEffect } from 'react';
import { Post } from '@/types/post';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { a11y, useReducedMotion } from '@/utils/accessibility';

interface PostListProps {
  posts: Post[];
  canEdit?: boolean;
  onArchive?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
  pageSize?: number;
}

export function PostList({ posts, canEdit, onArchive, onDuplicate, onEdit, onDelete, onUpdate, pageSize = 10 }: PostListProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const reduceMotion = useReducedMotion();
  
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
  
  if (posts.length === 0) {
    return (
      <div className="text-center py-12" role="status" aria-live="polite">
        <div className="glass-card p-8 rounded-xl border border-border/50 max-w-md mx-auto">
          <div className="text-4xl mb-4" aria-hidden="true">📭</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhum post encontrado
          </h3>
          <p className="text-muted-foreground text-sm">
            Não há posts correspondentes aos filtros selecionados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" role="feed" aria-label="Lista de posts">
      <div className="space-y-4" role="list">
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
            />
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <nav 
          className="flex items-center justify-center gap-4 pt-4" 
          aria-label="Navegação de páginas"
          role="navigation"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage === 0}
            className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <span>
              Página {currentPage + 1} de {totalPages}
            </span>
            <span aria-hidden="true">•</span>
            <span>
              {posts.length} posts total
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages - 1}
            className="flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Próxima página"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
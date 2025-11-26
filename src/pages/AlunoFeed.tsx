import { useState, useEffect, useMemo } from 'react';
import { FilterBar } from '@/components/feed/FilterBar';
import { PostList } from '@/components/feed/PostList';
import { SmartFilterStatus } from '@/components/feed/SmartFilterStatus';
import { InviteFriendsModal } from '@/components/aluno/InviteFriendsModal';
import { usePosts } from '@/hooks/usePosts';
import { useSaved } from '@/hooks/useSaved';
import { useAuth } from '@/contexts/AuthContext';
import { useAlunoFeedPreferences } from '@/hooks/useAlunoFeedPreferences';
import { useSelectValidation } from '@/hooks/useSelectValidation';
import { PostFilter, Post } from '@/types/post';
import { useScrollToFeedPost } from '@/hooks/useScrollToFeedPost';
import { FeedNavigation } from '@/utils/feed-navigation';
import { SmartPostFilters } from '@/utils/post-filters';

export default function AlunoFeed() {
  const { user } = useAuth();
  const { preferences, updatePreferences } = useAlunoFeedPreferences();
  const { savedIds } = useSaved();
  const [filter, setFilter] = useState<PostFilter & { saved?: boolean; authorRole?: 'secretaria' | 'professor' | 'aluno' }>({});
  const [updateKey, setUpdateKey] = useState(0);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedEventForInvite, setSelectedEventForInvite] = useState<Post | null>(null);

  // Validate Select components in development
  useSelectValidation('AlunoFeed');
  
  if (!user || user.role !== 'aluno') {
    return (
      <div className="text-center p-8" role="alert">
        <p className="text-destructive">Acesso negado. Esta página é apenas para alunos.</p>
      </div>
    );
  }
  
  // Get posts based on filter (including authorRole)
  const baseFilter = filter.saved 
    ? { ...filter, saved: undefined } // Remove saved from the base filter
    : filter;
    
  const { posts: allPosts, isLoading } = usePosts(baseFilter);
  
  // Deep link navigation and focus functionality with auto-filter adjustment
  const { targetPostId, shouldFocus } = useScrollToFeedPost({
    posts: allPosts,
    isLoading: false, // posts hook handles loading
    onFiltersAutoAdjust: () => {
      // Auto-adjust filters to show all posts when targeting specific post
      setFilter({
        type: undefined, // Show all types
        authorRole: undefined, // All author roles
        saved: undefined // Clear saved filter
      });
    }
  });

  // Don't reset filters automatically - let the auto-adjust handle it
  // Reset filters when deep linking to show target post
  // useEffect(() => {
  //   if (targetPostId) {
  //     const defaultFilters = FeedNavigation.getDefaultFilters();
  //     setFilter(defaultFilters);
  //   }
  // }, [targetPostId]);
  
  // Apply advanced filtering and preferences with smart filtering
  const processedPosts = useMemo(() => {
    let posts = [...allPosts];
    
    // Apply smart filtering to remove expired posts (unless showing saved or preference disabled)
    if (!filter.saved && preferences.hideExpired !== false) {
      posts = SmartPostFilters.getSmartFeed(posts, {
        includeExpired: false,
        maxAge: 30, // Keep posts for 30 days max
        prioritizeUpcoming: preferences.sortBy === 'relevant'
      });
    }
    
    // Apply saved filter if needed
    if (filter.saved) {
      posts = posts.filter(post => savedIds.includes(post.id));
    }
    
    // Apply preferences
    if (preferences.hideRead) {
      // TODO: Implement read status filtering
      // posts = posts.filter(post => !readIds.includes(post.id));
    }
    
    // Apply sorting
    if (preferences.sortBy === 'recent') {
      // FASE 1: Usa ordenação cronológica inteligente (prioriza últimas 24h, depois urgentes, depois por data)
      posts = SmartPostFilters.sortChronologicalFirst(posts);
    } else if (preferences.sortBy === 'urgency') {
      // Ordenação por urgência temporal
      posts = SmartPostFilters.sortByUrgency(posts);
    } else {
      // 'relevant' sorting - use smart relevance sorting
      posts = SmartPostFilters.sortByRelevance(posts);
    }
    
    return posts;
  }, [allPosts, filter.saved, savedIds, preferences.hideRead, preferences.hideExpired, preferences.sortBy]);

  const handleUpdate = () => {
    setUpdateKey(prev => prev + 1);
  };

  const handleToggleExpired = () => {
    updatePreferences({ hideExpired: !preferences.hideExpired });
  };

  const handleInviteFriend = (post: Post) => {
    setSelectedEventForInvite(post);
    setInviteModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 space-y-6" role="main">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Feed do Aluno
          </h1>
          <p className="text-muted-foreground">
            Acompanhe as últimas atualizações da escola
          </p>
        </header>

        <div className="space-y-6">
          <FilterBar onFilterChange={setFilter} />
          
          <SmartFilterStatus
            totalPosts={allPosts.length}
            filteredPosts={processedPosts.length}
            hideExpired={preferences.hideExpired !== false}
            onToggleExpired={handleToggleExpired}
          />
          
          <PostList
            key={updateKey}
            posts={processedPosts}
            isLoading={isLoading}
            onUpdate={handleUpdate}
            pageSize={preferences.pageSize}
            onInviteFriend={handleInviteFriend}
          />
        </div>
      </div>
      
      {/* Invite Friends Modal */}
      {selectedEventForInvite && user && (
        <InviteFriendsModal
          isOpen={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            setSelectedEventForInvite(null);
          }}
          event={selectedEventForInvite}
          studentId={user.id}
        />
      )}
    </div>
  );
}
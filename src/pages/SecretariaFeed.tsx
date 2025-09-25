import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { FilterBar } from '@/components/feed/FilterBar';

import { PostComposer } from '@/components/feed/PostComposer';
import { PostList } from '@/components/feed/PostList';
import { postStore } from '@/stores/post-store';
import { useSaved } from '@/hooks/useSaved';
import { usePostActions } from '@/hooks/usePostActions';
import { Post, PostFilter, PostInput, PostType } from '@/types/post';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Rss, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollToFeedPost } from '@/hooks/useScrollToFeedPost';
import { FeedNavigation } from '@/utils/feed-navigation';
import { ScheduledEmptyState } from '@/components/feed/ScheduledEmptyState';

export default function SecretariaFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { savedIds } = useSaved();
  const { 
    createPost, 
    updatePost, 
    archivePost, 
    deletePost, 
    duplicatePost, 
    getPostForEdit,
    isLoading
  } = usePostActions();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [filters, setFilters] = useState<PostFilter & { saved?: boolean; quickFilter?: string }>({});
  const [showComposer, setShowComposer] = useState(false);
  const [editingPost, setEditingPost] = useState<(PostInput & { originalId?: string }) | null>(null);
  const [updateKey, setUpdateKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Deep link navigation and focus functionality with auto-filter adjustment
  const { targetPostId, shouldFocus } = useScrollToFeedPost({
    posts,
    isLoading,
    onFiltersAutoAdjust: () => {
      // Auto-adjust filters to show all posts when targeting specific post
      setFilters({
        type: undefined, // Show all types
        status: 'PUBLISHED', // Only published posts
        classId: undefined, // All classes
        quickFilter: undefined // Clear quick filter
      });
    }
  });

  const allowedTypes: PostType[] = ['AVISO', 'COMUNICADO', 'EVENTO'];
  const canEdit = user?.role === 'secretaria';

  // Handle edit mode from URL params
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && canEdit && !editingPost) {
      const editData = getPostForEdit(editId);
      if (editData) {
        setEditingPost(editData);
        setShowComposer(true);
        // Remove edit param from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('edit');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, canEdit, editingPost, getPostForEdit, setSearchParams]);

  useEffect(() => {
    loadPosts();
  }, [filters, savedIds]);

  // Don't reset filters automatically - let the auto-adjust handle it
  // Reset filters when deep linking to show target post
  // useEffect(() => {
  //   if (targetPostId) {
  //     const defaultFilters = FeedNavigation.getDefaultFilters();
  //     setFilters(defaultFilters);
  //   }
  // }, [targetPostId]);

  const loadPosts = () => {
    const { saved, quickFilter, ...baseFilters } = filters;
    let filteredPosts = postStore.list(baseFilters);
    
    // Apply specific logic for secretaria quick filter
    if (quickFilter === 'secretaria') {
      // Only show posts created by secretaria staff (exclude posts from professors)
      filteredPosts = filteredPosts.filter(post => {
        // Check if post was created by secretaria (not by professors)
        const isSecretariaAuthor = !post.authorName.toLowerCase().includes('prof.');
        const isSecretariaType = ['AVISO', 'COMUNICADO', 'EVENTO'].includes(post.type);
        return isSecretariaAuthor && isSecretariaType;
      });
    }
    
    // Apply saved filter if needed
    if (saved) {
      filteredPosts = filteredPosts.filter(post => savedIds.includes(post.id));
    }
    
    setPosts(filteredPosts);
  };

  const handleUpdate = () => {
    setUpdateKey(prev => prev + 1);
    loadPosts();
  };

  const handleCreatePost = async (postInput: PostInput) => {
    if (!user) return;
    
    let success = false;
    
    if (editingPost?.originalId) {
      // This is an edit operation
      success = await updatePost(editingPost.originalId, postInput);
    } else {
      // This is a create operation
      success = await createPost(postInput, user.name);
    }
    
    if (success) {
      loadPosts();
      setShowComposer(false);
      setEditingPost(null);
    }
  };

  const handleArchive = async (id: string) => {
    const success = await archivePost(id);
    if (success) {
      loadPosts();
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deletePost(id);
    if (success) {
      loadPosts();
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!user) return;
    
    const success = await duplicatePost(id, user.name);
    if (success) {
      loadPosts();
    }
  };

  const handleEdit = (id: string) => {
    const editData = getPostForEdit(id);
    
    if (editData) {
      setEditingPost(editData);
      setShowComposer(true);
      setUpdateKey(prev => prev + 1); // Force re-render
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do post para edição.",
        variant: "destructive",
      });
    }
  };

  const handleComposerCancel = () => {
    setShowComposer(false);
    setEditingPost(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
            <Rss className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Feed da Secretaria</h1>
            <p className="text-muted-foreground">
              Gerencie avisos, comunicados e eventos da escola
            </p>
          </div>
        </div>

        {canEdit && !showComposer && (
          <Button
            onClick={() => setShowComposer(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Post
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <span className="text-orange-400">📢</span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avisos</p>
                <p className="text-xl font-bold text-orange-400">
                  {posts.filter(p => p.type === 'AVISO' && p.status === 'PUBLISHED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <span className="text-blue-400">📋</span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Comunicados</p>
                <p className="text-xl font-bold text-blue-400">
                  {posts.filter(p => p.type === 'COMUNICADO' && p.status === 'PUBLISHED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <span className="text-purple-400">📅</span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Eventos</p>
                <p className="text-xl font-bold text-purple-400">
                  {posts.filter(p => p.type === 'EVENTO' && p.status === 'PUBLISHED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <span className="text-yellow-400">⏰</span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agendados</p>
                <p className="text-xl font-bold text-yellow-400">
                  {postStore.list({ status: 'SCHEDULED' }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Composer */}
      {canEdit && showComposer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" data-composer="secretaria">
            <PostComposer
              key={updateKey} // Force re-render when editing
              allowedTypes={allowedTypes}
              onSubmit={handleCreatePost}
              initialData={editingPost}
              onCancel={handleComposerCancel}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Unified Filters */}
      <FilterBar onFilterChange={setFilters} />

      {/* Posts List */}
      {filters.quickFilter === 'scheduled' && posts.length === 0 ? (
        <ScheduledEmptyState 
          onCreatePost={() => setShowComposer(true)}
          userName={user?.name}
        />
      ) : (
        <PostList
          key={updateKey}
          posts={posts}
          canEdit={canEdit}
          onArchive={handleArchive}
          onDuplicate={handleDuplicate}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
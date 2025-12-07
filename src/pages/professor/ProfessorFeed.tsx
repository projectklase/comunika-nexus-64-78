import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PostComposer } from '@/components/feed/PostComposer';
import { PostList } from '@/components/feed/PostList';
import { ProfessorFeedFilters } from '@/components/feed/ProfessorFeedFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProfessorMetrics } from '@/hooks/useProfessorMetrics';
import { useProfessorFeedFilters } from '@/hooks/useProfessorFeedFilters';
import { usePostActions } from '@/hooks/usePostActions';
import { useScrollToPost } from '@/hooks/useScrollToPost';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { FeedNavigation } from '@/utils/feed-navigation';
import { useSaved } from '@/hooks/useSaved';
import { Post, PostInput, PostType } from '@/types/post';
import { 
  BookOpen, 
  Plus, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Eye,
  TrendingUp
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProfessorFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { savedIds } = useSaved();
  const { goToCalendarWithActivity } = useCalendarNavigation();
  const metrics = useProfessorMetrics();
  
  const { 
    createPost, 
    updatePost, 
    archivePost,
    deletePost,
    duplicatePost,
    getPostForEdit,
    isLoading
  } = usePostActions();

  const { 
    filteredPosts, 
    feedMetrics, 
    isLoading: isLoadingPosts,
    hideExpired,
    setHideExpired,
    totalPosts
  } = useProfessorFeedFilters();
  
  const [showComposer, setShowComposer] = useState(false);
  const [editingPost, setEditingPost] = useState<(PostInput & { originalId?: string }) | null>(null);
  const [updateKey, setUpdateKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Deep link navigation and focus functionality
  const { targetPostId } = useScrollToPost({
    posts: filteredPosts,
    isLoading
  });

  const allowedTypes: PostType[] = ['ATIVIDADE', 'TRABALHO', 'PROVA'];
  const canEdit = user?.role === 'professor';

  // Handle edit mode from URL params
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && canEdit && !editingPost) {
      getPostForEdit(editId).then(editData => {
        if (editData) {
          setEditingPost(editData);
        setShowComposer(true);
        // Remove edit param from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('edit');
        setSearchParams(newParams, { replace: true });
        }
      });
    }
  }, [searchParams, canEdit, editingPost, getPostForEdit, setSearchParams]);

  const handleUpdate = () => {
    setUpdateKey(prev => prev + 1);
  };

  const handleCreatePost = async (postInput: PostInput) => {
    if (!user) return;
    
    let success = false;
    
    if (editingPost?.originalId) {
      success = await updatePost(editingPost.originalId, postInput);
    } else {
      success = await createPost(postInput, user.name);
    }
    
    if (success) {
      setShowComposer(false);
      setEditingPost(null);
      handleUpdate();
    }
  };

  const handleEdit = (id: string) => {
    getPostForEdit(id).then(editData => {
      if (editData) {
        setEditingPost(editData);
        setShowComposer(true);
        setUpdateKey(prev => prev + 1);
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da atividade para edição.",
          variant: "destructive",
        });
      }
    });
  };

  const handleArchive = async (id: string) => {
    const success = await archivePost(id);
    if (success) {
      handleUpdate();
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deletePost(id);
    if (success) {
      handleUpdate();
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!user) return;
    
    const success = await duplicatePost(id, user.name);
    if (success) {
      handleUpdate();
    }
  };

  const handleCopyLink = async (post: Post) => {
    try {
      const shareableLink = FeedNavigation.createShareableLink(user?.role || 'professor', post);
      await navigator.clipboard.writeText(shareableLink);
      toast({
        title: "Link copiado!",
        description: "O link da atividade foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const handleGoToCorrect = (classId: string) => {
    navigate(`/professor/turma/${classId}?tab=entregas&status=AGUARDANDO`);
  };

  const handleViewActivity = (post: Post) => {
    if (post.classIds && post.classIds.length > 0) {
      navigate(`/professor/turma/${post.classIds[0]}/atividade/${post.id}`);
    }
  };

  const formatDueDate = (dueAt: string) => {
    const date = new Date(dueAt);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd 'de' MMM", { locale: ptBR });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 space-y-6" role="main">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Feed do Professor
              </h1>
              <p className="text-muted-foreground">
                Centralize suas atividades e ações pendentes
              </p>
            </div>
          </div>

      {canEdit && (
        <Button
          onClick={() => navigate('/professor/atividades/nova')}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      )}
        </div>

        {/* Feed Metrics Overview */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Visão Geral do Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-2xl font-bold text-primary">{feedMetrics.all}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-400">{feedMetrics.atividade}</div>
                <div className="text-xs text-muted-foreground">Atividades</div>
              </div>
              <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="text-2xl font-bold text-orange-400">{feedMetrics.trabalho}</div>
                <div className="text-xs text-muted-foreground">Trabalhos</div>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-2xl font-bold text-red-400">{feedMetrics.prova}</div>
                <div className="text-xs text-muted-foreground">Provas</div>
              </div>
              <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-400">{feedMetrics.eventos}</div>
                <div className="text-xs text-muted-foreground">Eventos</div>
              </div>
              <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-400">{feedMetrics.agendados}</div>
                <div className="text-xs text-muted-foreground">Agendados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Para Agir Agora */}
        {metrics && (
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                Para Agir Agora
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Entregas Pendentes */}
              {metrics.pendingDeliveries > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="font-medium">
                        {metrics.pendingDeliveries} entrega{metrics.pendingDeliveries > 1 ? 's' : ''} para corrigir
                      </p>
                      <div className="flex gap-2 mt-1">
                        {metrics.pendingByClass.map(item => (
                          <Badge key={item.class.id} variant="secondary" className="text-xs">
                            {item.class.name}: {item.pending}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleGoToCorrect(metrics.pendingByClass[0]?.class.id)}>
                    Corrigir Agora
                  </Button>
                </div>
              )}

              {/* Vencem em 48h */}
              {metrics.activitiesDueSoon.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                    Vencem em 48h ({metrics.activitiesDueSoon.length})
                  </h4>
                  {metrics.activitiesDueSoon.slice(0, 3).map(activity => (
                    <div key={activity.id} className="flex items-center justify-between p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.dueAt && formatDueDate(activity.dueAt)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleViewActivity(activity)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => activity.dueAt && goToCalendarWithActivity(activity.dueAt, activity.id)}
                        >
                          <Calendar className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Atrasadas */}
              {metrics.overdueActivities.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="font-medium text-red-400">
                        {metrics.overdueActivities.length} atividade{metrics.overdueActivities.length > 1 ? 's' : ''} atrasada{metrics.overdueActivities.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {metrics.pendingDeliveries === 0 && metrics.activitiesDueSoon.length === 0 && metrics.overdueActivities.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p>Tudo em dia! 🎉</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Composer */}
        {canEdit && showComposer && (
          <PostComposer
            key={updateKey}
            allowedTypes={allowedTypes}
            onSubmit={handleCreatePost}
            initialData={editingPost}
            onCancel={() => {
              setShowComposer(false);
              setEditingPost(null);
            }}
            isLoading={isLoading}
          />
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters */}
          <div className="lg:col-span-1">
            <ProfessorFeedFilters />
          </div>

          {/* Posts */}
          <div className="lg:col-span-3 space-y-6">
            {isLoadingPosts ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando posts...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border border-border/50">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2 text-muted-foreground">
                  Nenhum post encontrado
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Não há posts que correspondam aos filtros atuais.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button variant="outline" onClick={() => setShowComposer(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Nova Atividade
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/professor/calendario')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Ver Calendário
                  </Button>
                </div>
              </div>
            ) : (
              <PostList 
                posts={filteredPosts}
                canEdit={canEdit}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onUpdate={handleUpdate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
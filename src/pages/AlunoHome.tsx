import { useState, useEffect, useMemo } from 'react';
import { parseISO, isToday, isThisWeek, startOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
// import { Target } from 'lucide-react'; // NEXUS REMOVIDO
import { TodaySection } from '@/components/aluno/TodaySection';
import { ImmersivePostCard } from '@/components/aluno/ImmersivePostCard';
import { StudentStreakWidget } from '@/components/student/StudentStreakWidget';
import { QuickFilters, QuickFiltersState } from '@/components/aluno/QuickFilters';
import { AgendaSkeleton, TodaySkeleton, MiniCalendarSkeleton } from '@/components/aluno/AgendaSkeleton';
import { DrawerEntrega } from '@/components/feed/DrawerEntrega';
import { PostDetailDrawer } from '@/components/feed/PostDetailDrawer';
// import { NexusOrb } from '@/components/nexus/NexusOrb'; // NEXUS REMOVIDO
// import { NexusPanel } from '@/components/nexus/NexusPanel'; // NEXUS REMOVIDO
import { usePosts } from '@/hooks/usePosts';
import { useSaved } from '@/hooks/useSaved';
import { useReads } from '@/hooks/useReads';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { usePostActionsUnified } from '@/hooks/usePostActionsUnified';
import { useSmartAgenda } from '@/hooks/useSmartAgenda';
import { useStudentGamification } from '@/stores/studentGamification';
import { Post, PostType } from '@/types/post';
import { ROUTES } from '@/constants/routes';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logAudit } from '@/stores/audit-store';

const FILTERS_STORAGE_KEY = 'aluno-home-filters';

const defaultFilters: QuickFiltersState = {
  selectedTypes: [],
  timeFilter: 'all',
  showOnlySaved: false
};

export default function AlunoHome() {
  const { user } = useAuth();
  const { savedIds } = useSaved();
  const { markAsRead } = useReads();
  const { openInCalendar } = usePostActionsUnified();
  const { scheduleStudyBlock, getTodayBlocks } = useSmartAgenda();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState<QuickFiltersState>(defaultFilters);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<'entrega' | 'detail' | null>(null);
  const [updateKey, setUpdateKey] = useState(0);
  // const [isNexusPanelOpen, setIsNexusPanelOpen] = useState(false); // NEXUS REMOVIDO
  const [isLoading, setIsLoading] = useState(true);

  // Load filters from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFilters({ ...defaultFilters, ...parsed });
      }
    } catch (error) {
      console.warn('Error loading filters:', error);
    }
  }, []);

  // Save filters to localStorage
  const updateFilters = (newFilters: QuickFiltersState) => {
    setFilters(newFilters);
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(newFilters));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    localStorage.removeItem(FILTERS_STORAGE_KEY);
  };

  // Get all posts
  const { posts: allPosts } = usePosts({
    status: 'PUBLISHED'
  });

  // Apply filters
  const filteredPosts = useMemo(() => {
    let posts = [...allPosts];

    // Apply saved filter
    if (filters.showOnlySaved) {
      posts = posts.filter(post => savedIds.includes(post.id));
    }

    // Apply type filters
    if (filters.selectedTypes.length > 0) {
      posts = posts.filter(post => filters.selectedTypes.includes(post.type));
    }

    // Apply time filters
    if (filters.timeFilter === 'today') {
      posts = posts.filter(post => {
        const dateToCheck = post.dueAt || post.eventStartAt;
        if (!dateToCheck) return false;
        return isToday(parseISO(dateToCheck));
      });
    } else if (filters.timeFilter === 'week') {
      posts = posts.filter(post => {
        const dateToCheck = post.dueAt || post.eventStartAt;
        if (!dateToCheck) return false;
        return isThisWeek(parseISO(dateToCheck), { weekStartsOn: 1 });
      });
    }

    // Sort by relevance and urgency
    posts.sort((a, b) => {
      // Priority: urgent activities, then events, then others
      const priorityOrder = { ATIVIDADE: 3, TRABALHO: 3, PROVA: 3, EVENTO: 2, COMUNICADO: 1, AVISO: 1 };
      const aPriority = priorityOrder[a.type] || 0;
      const bPriority = priorityOrder[b.type] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Within same priority, sort by date (due date for activities, event date for events, created date for others)
      const aDate = a.dueAt || a.eventStartAt || a.createdAt;
      const bDate = b.dueAt || b.eventStartAt || b.createdAt;
      
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

    return posts;
  }, [allPosts, filters, savedIds]);

  if (!user || user.role !== 'aluno') {
    return (
      <div className="text-center p-8" role="alert">
        <p className="text-destructive">Acesso negado. Esta página é apenas para alunos.</p>
      </div>
    );
  }

  // Telemetry helper
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    console.log(`[AGENDA_TELEMETRY] ${event}`, properties);
    // In production, integrate with your analytics service
  };

  const handleOpenPost = (post: Post) => {
    trackEvent('AGENDA_OPEN_DETAILS', { postId: post.id, postType: post.type });
    setSelectedPost(post);
    setActiveDrawer('detail');
  };

  const handleGoToCalendar = (post: Post) => {
    logAudit({
      action: 'READ',
      entity: 'POST',
      entity_id: post.id,
      entity_label: post.title,
      actor_id: user!.id,
      actor_name: user!.name,
      actor_email: user!.email,
      actor_role: user!.role,
      scope: post.audience === 'GLOBAL' ? 'GLOBAL' : `CLASS:${post.classId}`,
      meta: {
        post_type: post.type,
        event_start: post.eventStartAt,
        due_at: post.dueAt,
        has_date: !!(post.eventStartAt || post.dueAt) 
      }
    });

    try {
      openInCalendar(post);
    } catch (error) {
      console.error('Error navigating to calendar:', error);
      toast({
        title: "Erro na navegação",
        description: "Não foi possível abrir o calendário.",
        variant: "destructive",
      });
    }
  };

  const handleMarkDelivered = (post: Post) => {
    trackEvent('AGENDA_MARK_DELIVERED', { postId: post.id, postType: post.type });
    setSelectedPost(post);
    setActiveDrawer('entrega');
  };
  
  const handleAfterDeliverySuccess = () => {
    // Trigger gamification XP gain when activity is delivered
    try {
      const { addActivityXP } = useStudentGamification.getState();
      const xpGained = addActivityXP(selectedPost?.id || '');
      
      if (xpGained > 0) {
        toast({
          title: `+${xpGained} XP! 🎉`,
          description: 'Atividade entregue com sucesso!'
        });
      }
    } catch (error) {
      console.error('Error adding activity XP:', error);
    }
    handleUpdate();
  };

  const handleMarkAsRead = (post: Post) => {
    trackEvent('AGENDA_MARK_READ', { postId: post.id, postType: post.type });
    markAsRead(post.id);
    toast({
      title: 'Marcado como lido',
      description: 'Post foi marcado como lido com sucesso.'
    });
    setUpdateKey(prev => prev + 1);
  };

  const handleScheduleStudyBlock = (post: Post) => {
    trackEvent('AGENDA_SCHEDULE_STUDY', { postId: post.id, postType: post.type });
    
    try {
      // Simple scheduling logic - in production, you might want a more sophisticated approach
      const now = new Date();
      const suggestedStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      const duration = 60; // 1 hour default
      
      scheduleStudyBlock(post.id, suggestedStart, duration);
      
      toast({
        title: 'Bloco de estudo agendado',
        description: `Estudo para "${post.title}" agendado para ${suggestedStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      });
      setUpdateKey(prev => prev + 1);
    } catch (error) {
      console.error('Error scheduling study block:', error);
      toast({
        title: 'Erro ao agendar estudo',
        description: 'Não foi possível agendar o bloco de estudo.',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveStudyBlock = (post: Post) => {
    trackEvent('AGENDA_REMOVE_STUDY', { postId: post.id, postType: post.type });
    
    try {
      // Find and remove study blocks for this activity
      const blocks = getTodayBlocks();
      const activityBlocks = blocks.filter(block => block.activityId === post.id);
      
      // In a real implementation, you'd call a remove method on the smart agenda store
      // For now, we'll just show a success message
      
      toast({
        title: 'Bloco de estudo removido',
        description: `Estudo para "${post.title}" foi removido da sua agenda`
      });
      setUpdateKey(prev => prev + 1);
    } catch (error) {
      console.error('Error removing study block:', error);
      toast({
        title: 'Erro ao remover estudo',
        description: 'Não foi possível remover o bloco de estudo.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdate = () => {
    setUpdateKey(prev => prev + 1);
  };

  const handleDayFocus = (date: Date) => {
    trackEvent('AGENDA_DAY_FOCUS', { 
      date: date.toISOString().split('T')[0],
      source: 'mini_calendar'
    });
    
    // Trigger gamification mission completion for "openDayFocus"
    try {
      const { dailyMission, completeDailyMission } = useStudentGamification.getState();
      if (dailyMission.id === 'openDayFocus' && !dailyMission.done) {
        const xpGained = completeDailyMission();
        if (xpGained > 0) {
          toast({
            title: `Missão completa! +${xpGained} XP ⭐`,
            description: 'Você abriu o Dia em Foco!'
          });
        }
      }
    } catch (error) {
      console.error('Error completing daily mission:', error);
    }
    
    // Navigate to calendar with the selected date focused
    const dateParam = date.toISOString().split('T')[0];
    navigate(`/aluno/calendario?d=${dateParam}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6 space-y-6" role="main">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
            Sua Agenda Escolar
          </h1>
          <p className="text-muted-foreground">
            Tudo o que você precisa saber, quando precisa saber
          </p>
        </header>

        {/* Desktop Layout: Sidebar + Main */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters & Mini Calendar */}
          <div className="lg:col-span-1 space-y-4">
            <QuickFilters
              filters={filters}
              onFiltersChange={updateFilters}
              onReset={resetFilters}
            />
            
            <StudentStreakWidget />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Today Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Hoje</h2>
                {/* NEXUS REMOVIDO
                <Button
                  onClick={() => navigate(ROUTES.ALUNO.NEXUS)}
                  variant="outline"
                  size="sm"
                  className="glass-card border-primary/30 hover:bg-primary/10"
                >
                  <Target className="h-4 w-4 mr-2" />
                  NEXUS Planner
                </Button>
                */}
              </div>
              
              <TodaySection
                posts={allPosts}
                onOpenPost={handleOpenPost}
                onGoToCalendar={handleGoToCalendar}
              />
            </div>

            {/* Immersive Cards Grid */}
            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="glass-card p-8 rounded-xl border border-border/50 max-w-md mx-auto">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nada por aqui!
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {filters.selectedTypes.length > 0 || filters.timeFilter !== 'all' || filters.showOnlySaved
                        ? 'Nenhum item corresponde aos filtros selecionados.'
                        : 'Você está em dia com tudo! 🎉'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {filteredPosts.map((post) => (
                    <ImmersivePostCard
                      key={post.id}
                      post={post}
                      onOpenDetails={handleOpenPost}
                      onGoToCalendar={handleGoToCalendar}
                      onMarkDelivered={handleMarkDelivered}
                      onMarkAsRead={handleMarkAsRead}
                      onScheduleStudyBlock={handleScheduleStudyBlock}
                      onRemoveStudyBlock={handleRemoveStudyBlock}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEXUS Integration - REMOVIDO */}
      {/* <NexusOrb onOpenPanel={() => setIsNexusPanelOpen(true)} /> */}
      {/* <NexusPanel 
        isOpen={isNexusPanelOpen} 
        onClose={() => setIsNexusPanelOpen(false)} 
      /> */}

      {/* Drawers */}
      {selectedPost && (
        <>
          <DrawerEntrega
            isOpen={activeDrawer === 'entrega'}
            onClose={() => {
              setActiveDrawer(null);
              setSelectedPost(null);
            }}
            activity={selectedPost}
            classId={selectedPost.classId || selectedPost.classIds?.[0] || ''}
            onSuccess={handleAfterDeliverySuccess}
          />
          
          <PostDetailDrawer
            isOpen={activeDrawer === 'detail'}
            onClose={() => {
              setActiveDrawer(null);
              setSelectedPost(null);
            }}
            post={selectedPost}
          />
        </>
      )}
    </div>
  );
}
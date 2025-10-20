import React, { useState, useEffect, memo, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentPosts } from '@/hooks/useStudentPosts';
import { useScrollToFeedPost } from '@/hooks/useScrollToFeedPost';
import { TodaySectionDashboard } from '@/components/student/dashboard/TodaySectionDashboard';
import { NextDaysList } from '@/components/student/dashboard/NextDaysList';
import { QuickActionsDashboard } from '@/components/student/dashboard/QuickActionsDashboard';
import { MiniCalendarDashboard } from '@/components/student/dashboard/MiniCalendarDashboard';
import { ImportantNotificationsDashboard } from '@/components/student/dashboard/ImportantNotificationsDashboard';
import { ProgressStripDashboard } from '@/components/student/dashboard/ProgressStripDashboard';
import { StreakDashboard } from '@/components/student/dashboard/StreakDashboard';
import { DrawerEntrega } from '@/components/feed/DrawerEntrega';
import { PostDetailDrawer } from '@/components/feed/PostDetailDrawer';
import { Post } from '@/types/post';
import { CalendarActionsHandler } from '@/utils/calendar-actions-handler';
import { resolveNotificationTarget } from '@/utils/resolve-notification-target';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { UnifiedCalendarNavigation } from '@/utils/calendar-navigation-unified';
import { ROUTES } from '@/constants/routes';
import { Calendar } from 'lucide-react';

const DASHBOARD_PREFS_KEY = 'alunoDashboardPrefs_v1';

interface DashboardPreferences {
  showOnlyToday: boolean;
  showOnlyThisWeek: boolean;
  defaultClassId?: string;
  autoRefreshInterval: number;
}

const defaultPreferences: DashboardPreferences = {
  showOnlyToday: false,
  showOnlyThisWeek: false,
  autoRefreshInterval: 5 * 60 * 1000 // 5 minutes
};

const StudentDashboard = memo(function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Load preferences
  const [preferences] = useState<DashboardPreferences>(defaultPreferences);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<'entrega' | 'detail' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Get posts with student-specific filtering (memoized)
  const studentPostsFilter = useMemo(() => ({
    timeRange: preferences.showOnlyToday ? 'today' as const : preferences.showOnlyThisWeek ? 'week' as const : 'all' as const,
    classId: preferences.defaultClassId
  }), [preferences.showOnlyToday, preferences.showOnlyThisWeek, preferences.defaultClassId]);

  const { posts, todayPosts, upcomingPosts } = useStudentPosts(studentPostsFilter);

  // Handle deep-linking from notifications or URLs
  const postIdParam = searchParams.get('postId');
  const focusParam = searchParams.get('focus');
  const dateParam = searchParams.get('date');

  useScrollToFeedPost({
    posts,
    isLoading: false,
    onFiltersAutoAdjust: () => {
      // Auto-adjust filters when deep-linking to a post
      // Clear any restrictive filters to help find the post
    }
  });

  // Load preferences from localStorage (removed, keeping for backwards compatibility)

  // Auto-focus on post from URL params
  useEffect(() => {
    if (postIdParam && posts.length > 0) {
      const targetPost = posts.find(p => p.id === postIdParam);
      if (targetPost) {
        setSelectedPost(targetPost);
        setActiveDrawer('detail');
        
        // Clear the postId from URL to prevent re-opening
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('postId');
        newParams.delete('focus');
        navigate(`${location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`, { replace: true });
      }
    }
  }, [postIdParam, posts, searchParams, navigate]);

  // Handle date param for mini-calendar
  useEffect(() => {
    if (dateParam) {
      try {
        const date = new Date(dateParam);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
        }
      } catch (error) {
        console.warn('Invalid date param:', dateParam);
      }
    }
  }, [dateParam]);

  // Security check
  if (!user || user.role !== 'aluno') {
    return (
      <div className="text-center p-8" role="alert">
        <p className="text-destructive">Acesso negado. Esta página é apenas para alunos.</p>
      </div>
    );
  }

  const handleOpenPost = (post: Post) => {
    setSelectedPost(post);
    setActiveDrawer('detail');
  };

  const handleGoToCalendar = (post: Post) => {
    if (!user) return;

    try {
      CalendarActionsHandler.navigateToCalendar(navigate, user.role, post, {
        onSuccess: () => {
          toast({
            title: "Redirecionando para o calendário",
            description: `Abrindo ${post.title} na data correspondente.`,
          });
        },
        onError: (error) => {
          console.error('Calendar navigation error:', error);
          toast({
            title: "Erro na navegação",
            description: "Não foi possível abrir o calendário. Tente novamente.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error('Calendar navigation error:', error);
      // Fallback to basic calendar
      navigate(ROUTES.ALUNO.CALENDARIO);
    }
  };

  const handleMarkDelivered = (post: Post) => {
    setSelectedPost(post);
    setActiveDrawer('entrega');
  };

  const handleDayClick = (date: Date) => {
    // Navigate to calendar with selected date and open day focus
    UnifiedCalendarNavigation.navigateToCalendar(navigate, user.role, {
      date,
      openDayModal: true,
      view: 'month'
    });
  };

  const handleAfterDeliverySuccess = () => {
    setActiveDrawer(null);
    setSelectedPost(null);
    toast({
      title: "Entrega realizada com sucesso!",
      description: "Sua atividade foi enviada para avaliação.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6 space-y-6" role="main">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
            Dashboard do Aluno
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user.name}! Aqui está tudo o que você precisa saber hoje.
          </p>
        </header>

        {/* Main Layout - Redesigned for better UX */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Today & Streak */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Section - HOJE */}
            <section aria-labelledby="today-section" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TodaySectionDashboard
                posts={posts}
                onOpenPost={handleOpenPost}
                onGoToCalendar={handleGoToCalendar}
                onMarkDelivered={handleMarkDelivered}
              />
            </section>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 gap-4">
              <section aria-labelledby="progress-section" className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ProgressStripDashboard posts={posts} />
              </section>
              
              <section aria-labelledby="streak-section" className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-75">
                <StreakDashboard />
              </section>
            </div>

            {/* Próximos 7 dias - Full Width */}
            <section aria-labelledby="next-days-section" className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
              <div className="flex items-center justify-between mb-4">
                <h2 id="next-days-section" className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Próximos 7 dias
                </h2>
                <span className="text-sm text-muted-foreground px-3 py-1 rounded-full bg-muted/50">
                  {posts.length} {posts.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <NextDaysList
                posts={posts}
                onOpenPost={handleOpenPost}
                onGoToCalendar={handleGoToCalendar}
              />
            </section>
          </div>

          {/* Right Column - Sidebar Optimized */}
          <div className="space-y-6">
            {/* Ações Rápidas - Top Priority */}
            <section aria-labelledby="quick-actions-section" className="animate-in fade-in slide-in-from-right-4 duration-500">
              <QuickActionsDashboard />
            </section>

            {/* Mini Calendário */}
            <section aria-labelledby="mini-calendar-section" className="animate-in fade-in slide-in-from-right-4 duration-700">
              <MiniCalendarDashboard
                posts={posts}
                onDayClick={handleDayClick}
                selectedDate={selectedDate}
              />
            </section>

            {/* Notificações Importantes */}
            <section aria-labelledby="important-notifications-section" className="animate-in fade-in slide-in-from-right-4 duration-700 delay-75">
              <ImportantNotificationsDashboard posts={posts} />
            </section>
          </div>
        </div>
      </div>

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
});

export default StudentDashboard;
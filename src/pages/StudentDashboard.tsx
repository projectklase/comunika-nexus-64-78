import React, { useState, useEffect, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentPosts } from '@/hooks/useStudentPosts';
import { useScrollToFeedPost } from '@/hooks/useScrollToFeedPost';
import { WelcomeStatusCard } from '@/components/student/dashboard/WelcomeStatusCard';
import { NextDaysList } from '@/components/student/dashboard/NextDaysList';
import { FeedPreviewDashboard } from '@/components/student/dashboard/FeedPreviewDashboard';
import { MiniCalendarDashboard } from '@/components/student/dashboard/MiniCalendarDashboard';
import { ImportantNotificationsDashboard } from '@/components/student/dashboard/ImportantNotificationsDashboard';
import { ProgressStripDashboard } from '@/components/student/dashboard/ProgressStripDashboard';
import { StreakDashboard } from '@/components/student/dashboard/StreakDashboard';
import { MyClassesCard } from '@/components/student/dashboard/MyClassesCard';
import { DrawerEntrega } from '@/components/feed/DrawerEntrega';
import { PostDetailDrawer } from '@/components/feed/PostDetailDrawer';
import { Post } from '@/types/post';
import { CalendarActionsHandler } from '@/utils/calendar-actions-handler';
import { toast } from '@/hooks/use-toast';
import { UnifiedCalendarNavigation } from '@/utils/calendar-navigation-unified';
import { ROUTES } from '@/constants/routes';
import { Calendar, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const StudentDashboard = memo(function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<'entrega' | 'detail' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Get posts with student-specific filtering
  const { posts } = useStudentPosts({ timeRange: 'all' });

  // Handle deep-linking from notifications or URLs
  const postIdParam = searchParams.get('postId');
  const dateParam = searchParams.get('date');

  useScrollToFeedPost({
    posts,
    isLoading: false,
    onFiltersAutoAdjust: () => {}
  });

  // Auto-focus on post from URL params
  useEffect(() => {
    if (postIdParam && posts.length > 0) {
      const targetPost = posts.find(p => p.id === postIdParam);
      if (targetPost) {
        setSelectedPost(targetPost);
        setActiveDrawer('detail');
        
        // Clear the postId from URL
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
      navigate(ROUTES.ALUNO.CALENDARIO);
    }
  };

  const handleMarkDelivered = (post: Post) => {
    setSelectedPost(post);
    setActiveDrawer('entrega');
  };

  const handleDayClick = (date: Date) => {
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
      <div className="container mx-auto px-4 py-6" role="main">
        
        {/* Main Layout - 2 Columns: 65% Main + 35% Sidebar */}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          
          {/* ========== COLUNA PRINCIPAL (65%) ========== */}
          <div className="space-y-6">
            
            {/* 1. Saudação + Status */}
            <section 
              aria-labelledby="welcome-section"
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <WelcomeStatusCard posts={posts} />
            </section>

            {/* 2. Próximos 7 dias (com HOJE integrado) */}
            <section 
              aria-labelledby="next-days-section"
              className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-75"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 id="next-days-section" className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Próximos 7 dias
                </h2>
              </div>
              <NextDaysList
                posts={posts}
                onOpenPost={handleOpenPost}
                onGoToCalendar={handleGoToCalendar}
              />
            </section>

            {/* 3. Importantes */}
            <section 
              aria-labelledby="important-section"
              className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150"
            >
              <ImportantNotificationsDashboard posts={posts} />
            </section>

            {/* 4. Meu Feed (Preview) */}
            <section 
              aria-labelledby="feed-section"
              className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200"
            >
              <FeedPreviewDashboard 
                posts={posts}
                onOpenPost={handleOpenPost}
              />
            </section>
            
          </div>
          
          {/* ========== COLUNA LATERAL (35%) ========== */}
          <div className="space-y-6">
            
            {/* 1. Mini Calendário */}
            <section 
              aria-labelledby="mini-calendar-section"
              className="animate-in fade-in slide-in-from-right-4 duration-500"
            >
              <MiniCalendarDashboard
                posts={posts}
                onDayClick={handleDayClick}
                selectedDate={selectedDate}
              />
            </section>

            {/* 2. Motivação e Progresso (Agrupado) */}
            <section 
              aria-labelledby="progress-section"
              className="animate-in fade-in slide-in-from-right-4 duration-700 delay-75"
            >
              <div className="glass-card border-border/50 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Seu Progresso</h3>
                </div>
                
                <ProgressStripDashboard posts={posts} />
                
                <Separator className="bg-border/50" />
                
                <StreakDashboard />
              </div>
            </section>

            {/* 3. Minhas Turmas */}
            <section 
              aria-labelledby="classes-section"
              className="animate-in fade-in slide-in-from-right-4 duration-700 delay-150"
            >
              <MyClassesCard posts={posts} />
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
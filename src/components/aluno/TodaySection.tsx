import { useMemo } from 'react';
import { format, isToday, isTomorrow, parseISO, isWithinInterval, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Bell, AlertTriangle } from 'lucide-react';
import { Post } from '@/types/post';
import { useReads } from '@/hooks/useReads';
import { useStudentGamification } from '@/stores/studentGamification';
import { useAuth } from '@/contexts/AuthContext';
import { usePostViews } from '@/stores/post-views.store';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TodaySectionProps {
  posts: Post[];
  onOpenPost: (post: Post) => void;
  onGoToCalendar: (post: Post) => void;
}

export function TodaySection({ posts, onOpenPost, onGoToCalendar }: TodaySectionProps) {
  const { isRead } = useReads();
  const { user } = useAuth();
  const { recordPostView } = usePostViews();

  const handleOpenPost = (post: Post) => {
    // Record post view
    if (user) {
      recordPostView(post.id, user, 'dashboard', user.classId);
    }
    
    // Verificação de role: gamificação só para alunos
    if (user && user.role === 'aluno') {
      // Trigger gamification mission completion for "openDayFocus" when opening an item
      try {
        const { dailyMission, completeDailyMission } = useStudentGamification.getState();
        if (dailyMission.id === 'openDayFocus' && !dailyMission.done) {
          const xpGained = completeDailyMission();
          if (xpGained > 0) {
            toast({
              title: `Missão completa! +${xpGained} XP ⭐`,
              description: 'Você abriu um item da sua agenda!'
            });
          }
        }
      } catch (error) {
        console.error('Error completing daily mission:', error);
      }
    }
    
    onOpenPost(post);
  };

  const todayData = useMemo(() => {
    const now = new Date();
    const tomorrow = addDays(now, 1);
    const in48Hours = addDays(now, 2);

    // Próximos prazos (T-48h)
    const upcomingDeadlines = posts.filter(post => {
      if (!post.dueAt) return false;
      const dueDate = parseISO(post.dueAt);
      return isWithinInterval(dueDate, { start: now, end: in48Hours });
    }).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());

    // Eventos de hoje
    const todayEvents = posts.filter(post => {
      if (post.type !== 'EVENTO' || !post.eventStartAt) return false;
      return isToday(parseISO(post.eventStartAt));
    });

    // Avisos não lidos
    const unreadNotices = posts.filter(post => 
      ['AVISO', 'COMUNICADO'].includes(post.type) && !isRead(post.id)
    ).slice(0, 3); // Limit to 3 most recent

    return { upcomingDeadlines, todayEvents, unreadNotices };
  }, [posts, isRead]);

  const getUrgencyBadge = (dueAt: string) => {
    const dueDate = parseISO(dueAt);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) {
      return <Badge variant="destructive" className="text-xs">Atrasado</Badge>;
    } else if (hoursUntilDue <= 24) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Hoje</Badge>;
    } else if (hoursUntilDue <= 48) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Amanhã</Badge>;
    }
    return null;
  };

  const formatDueTime = (dueAt: string) => {
    const dueDate = parseISO(dueAt);
    if (isToday(dueDate)) {
      return `Hoje às ${format(dueDate, 'HH:mm')}`;
    } else if (isTomorrow(dueDate)) {
      return `Amanhã às ${format(dueDate, 'HH:mm')}`;
    } else {
      return format(dueDate, "dd/MM 'às' HH:mm", { locale: ptBR });
    }
  };

  const hasContent = todayData.upcomingDeadlines.length > 0 || 
                   todayData.todayEvents.length > 0 || 
                   todayData.unreadNotices.length > 0;

  if (!hasContent) {
    return (
      <Card className="glass-card border-primary/30 neon-glow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary animate-glow-pulse" />
            Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-muted-foreground">Tudo em dia! Sem prazos urgentes ou eventos hoje.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-primary/30 neon-glow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary animate-glow-pulse" />
          Hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Próximos Prazos */}
        {todayData.upcomingDeadlines.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Próximos Prazos
            </h4>
            <div className="space-y-2">
              {todayData.upcomingDeadlines.map(post => (
                <div 
                  key={post.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/20 hover:border-primary/30 transition-all duration-200 group cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                  onClick={() => handleOpenPost(post)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir atividade ${post.title}, prazo ${formatDueTime(post.dueAt!)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenPost(post);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {post.title}
                      </h4>
                      {getUrgencyBadge(post.dueAt!)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDueTime(post.dueAt!)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 ml-2 flex-shrink-0 w-10 h-10 glass-card hover:glass-hover border border-transparent hover:border-primary/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGoToCalendar(post);
                    }}
                    aria-label={`Ver ${post.title} no calendário`}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eventos de Hoje */}
        {todayData.todayEvents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              Eventos de Hoje
            </h4>
            <div className="space-y-2">
              {todayData.todayEvents.map(post => (
                <div 
                  key={post.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:border-primary/30 transition-all duration-200 group cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                  onClick={() => handleOpenPost(post)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir evento ${post.title}${post.eventStartAt ? `, às ${format(parseISO(post.eventStartAt), 'HH:mm')}` : ''}${post.eventLocation ? `, em ${post.eventLocation}` : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenPost(post);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {post.title}
                    </h4>
                    {post.eventStartAt && (
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(post.eventStartAt), 'HH:mm')}
                        {post.eventLocation && ` • ${post.eventLocation}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avisos Não Lidos */}
        {todayData.unreadNotices.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-400" />
              Avisos Não Lidos
            </h4>
            <div className="space-y-2">
              {todayData.unreadNotices.map(post => (
                <div 
                  key={post.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 transition-all duration-200 group cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                    post.type === 'AVISO' 
                      ? "bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20"
                      : "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20"
                  )}
                  onClick={() => handleOpenPost(post)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir ${post.type.toLowerCase()} ${post.title}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenPost(post);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {post.title}
                      </h4>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {post.type === 'AVISO' ? '📢' : '📋'} {post.type}
                      </Badge>
                    </div>
                    {post.body && (
                      <p className="text-xs text-muted-foreground line-clamp-1 break-words">
                        {post.body}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
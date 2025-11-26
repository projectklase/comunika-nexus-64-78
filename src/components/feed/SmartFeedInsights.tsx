import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';
import { Post } from '@/types/post';
import { SmartPostFilters } from '@/utils/post-filters';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SmartFeedInsightsProps {
  posts: Post[];
  className?: string;
  compact?: boolean; // FASE 4: Modo compacto para mobile
}

export function SmartFeedInsights({ posts, className, compact = false }: SmartFeedInsightsProps) {
  const insights = useMemo(() => {
    const todaysPosts = SmartPostFilters.getTodaysPosts(posts);
    const upcomingPosts = SmartPostFilters.getUpcomingPosts(posts, 7);
    const priorityPosts = SmartPostFilters.getPriorityPosts(posts);
    
    const urgent = priorityPosts.filter(post => {
      const date = post.dueAt || post.eventStartAt;
      if (!date) return false;
      const postDate = new Date(date);
      return isToday(postDate) || isTomorrow(postDate);
    });
    
    return {
      today: todaysPosts.length,
      upcoming: upcomingPosts.length,
      urgent: urgent.length,
      priority: priorityPosts.length,
      totalActive: SmartPostFilters.filterRelevantPosts(posts).length
    };
  }, [posts]);

  const getNextUrgentPost = useMemo(() => {
    const priorityPosts = SmartPostFilters.getPriorityPosts(posts);
    return priorityPosts.find(post => {
      const date = post.dueAt || post.eventStartAt;
      return date && (isToday(new Date(date)) || isTomorrow(new Date(date)));
    });
  }, [posts]);

  if (insights.totalActive === 0) {
    return (
      <Card className={`glass-card border-border/50 ${className}`}>
        <CardContent className={compact ? "p-3 text-center" : "p-4 text-center"}>
          <CheckCircle2 className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} text-emerald-400 mx-auto mb-2`} />
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade pendente! 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  // FASE 4: Versão compacta sticky para mobile
  if (compact) {
    return (
      <Card className={`glass-card border-border/50 sticky top-4 z-10 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-4">
            {/* Quick badges horizontalmente */}
            <div className="flex items-center gap-3 flex-1">
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1 px-2">
                <Clock className="h-3 w-3" />
                {insights.today}
              </Badge>
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 text-xs flex items-center gap-1 px-2">
                <AlertTriangle className="h-3 w-3" />
                {insights.urgent}
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-xs flex items-center gap-1 px-2">
                <Calendar className="h-3 w-3" />
                {insights.upcoming}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {insights.totalActive} ativos
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // FASE 4: Versão desktop completa
  return (
    <Card className={`glass-card border-border/50 ${className}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Feed Inteligente</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Today's posts */}
          <div className="glass-card p-3 rounded-lg border border-border/30">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Hoje</span>
            </div>
            <p className="text-lg font-semibold text-emerald-400">{insights.today}</p>
          </div>

          {/* Urgent posts */}
          <div className="glass-card p-3 rounded-lg border border-border/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span className="text-xs text-muted-foreground">Urgente</span>
            </div>
            <p className="text-lg font-semibold text-amber-400">{insights.urgent}</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-blue-400" />
            <span className="text-muted-foreground">Próximos 7 dias:</span>
            <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
              {insights.upcoming}
            </Badge>
          </div>
          
          <div className="text-muted-foreground">
            {insights.totalActive} ativos
          </div>
        </div>

        {/* Next urgent item */}
        {getNextUrgentPost && (
          <div className="glass-card p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">Próximo urgente</span>
            </div>
            <p className="text-xs text-foreground font-medium truncate">
              {getNextUrgentPost.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {getNextUrgentPost.dueAt || getNextUrgentPost.eventStartAt 
                ? format(
                    new Date(getNextUrgentPost.dueAt || getNextUrgentPost.eventStartAt!), 
                    "dd/MM 'às' HH:mm", 
                    { locale: ptBR }
                  )
                : 'Sem data'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
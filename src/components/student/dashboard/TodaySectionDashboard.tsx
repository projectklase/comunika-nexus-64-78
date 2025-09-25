import React, { useMemo, memo } from 'react';
import { format, isToday, addDays, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, AlertCircle, CheckCircle2, FileText, BookOpen, Bell } from 'lucide-react';
import { Post } from '@/types/post';
import { useAuth } from '@/contexts/AuthContext';
import { deliveryStore } from '@/stores/delivery-store';
import { cn } from '@/lib/utils';

interface TodaySectionDashboardProps {
  posts: Post[];
  onOpenPost: (post: Post) => void;
  onGoToCalendar: (post: Post) => void;
  onMarkDelivered?: (post: Post) => void;
}

export const TodaySectionDashboard = memo(function TodaySectionDashboard({
  posts,
  onOpenPost,
  onGoToCalendar,
  onMarkDelivered
}: TodaySectionDashboardProps) {
  const { user } = useAuth();
  // deliveryStore is imported directly

  const todayItems = useMemo(() => {
    const now = new Date();
    const next48h = addDays(now, 2);
    
    return posts.filter(post => {
      const dateToCheck = post.dueAt || post.eventStartAt;
      if (!dateToCheck) {
        // Include unread notices (AVISO/COMUNICADO) from today
        if (['AVISO', 'COMUNICADO'].includes(post.type)) {
          return isToday(new Date(post.createdAt));
        }
        return false;
      }
      
      const postDate = new Date(dateToCheck);
      return isWithinInterval(postDate, { start: now, end: next48h });
    }).slice(0, 6); // Limit to 6 items
  }, [posts]);

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'PROVA':
        return <AlertCircle className="h-4 w-4" />;
      case 'TRABALHO':
        return <FileText className="h-4 w-4" />;
      case 'ATIVIDADE':
        return <BookOpen className="h-4 w-4" />;
      case 'EVENTO':
        return <Calendar className="h-4 w-4" />;
      case 'AVISO':
      case 'COMUNICADO':
        return <Bell className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PROVA':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'TRABALHO':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'ATIVIDADE':
        return 'text-primary bg-primary/10 border-primary/20';
      case 'EVENTO':
        return 'text-secondary bg-secondary/10 border-secondary/20';
      case 'AVISO':
      case 'COMUNICADO':
        return 'text-info bg-info/10 border-info/20';
      default:
        return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const getDateDisplay = (post: Post) => {
    const dateStr = post.dueAt || post.eventStartAt;
    if (!dateStr) return null;
    
    const date = new Date(dateStr);
    const isEventToday = isToday(date);
    
    if (isEventToday) {
      return (
        <span className="text-xs font-medium text-primary">
          Hoje • {format(date, 'HH:mm')}
        </span>
      );
    }
    
    return (
      <span className="text-xs text-muted-foreground">
        {format(date, 'dd/MM')} • {format(date, 'HH:mm')}
      </span>
    );
  };

  const isDelivered = (post: Post) => {
    if (!user) return false;
    return deliveryStore.getByStudentAndPost(user.id, post.id) !== null;
  };

  if (todayItems.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Você está em dia!
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            Nenhuma atividade ou evento para as próximas 48 horas. 
            Aproveite para revisar conteúdos ou relaxar!
          </p>
        </CardContent>
    </Card>
  );
}

return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Hoje e Próximas 48h
        </CardTitle>
        <CardDescription>
          Atividades, eventos e avisos importantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {todayItems.map((post) => {
          const delivered = isDelivered(post);
          const hasDate = !!(post.dueAt || post.eventStartAt);
          const isActivity = ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type);
          
          return (
            <div
              key={post.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
                "hover:bg-muted/30 hover:border-primary/30 cursor-pointer",
                "glass-subtle"
              )}
              onClick={() => onOpenPost(post)}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border",
                getTypeColor(post.type)
              )}>
                {getPostIcon(post.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {post.type}
                  </Badge>
                  {delivered && (
                    <Badge variant="outline" className="text-xs text-success bg-success/10">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Entregue
                    </Badge>
                  )}
                </div>
                
                <h4 className="font-medium text-sm text-foreground truncate">
                  {post.title}
                </h4>
                
                <div className="flex items-center justify-between mt-1">
                  {getDateDisplay(post)}
                  {post.classId && (
                    <span className="text-xs text-muted-foreground">
                      Turma {post.classId.slice(-4)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                {hasDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGoToCalendar(post);
                    }}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                )}
                
                {isActivity && !delivered && onMarkDelivered && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDelivered(post);
                    }}
                  >
                    Entregar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
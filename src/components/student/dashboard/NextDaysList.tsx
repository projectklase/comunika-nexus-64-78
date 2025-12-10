import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isTomorrow } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileText, Bell, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { Post } from '@/types/post';
import { cn } from '@/lib/utils';
import { ActivityCountdown } from '../ActivityCountdown';
import { useStudentDeliveries } from '@/hooks/useStudentDeliveries';

interface NextDaysListProps {
  posts: Post[];
  onOpenPost: (post: Post) => void;
  onGoToCalendar: (post: Post) => void;
}

interface DayGroup {
  date: Date;
  posts: Post[];
  label: string;
  isSpecial: boolean;
}

export function NextDaysList({ posts, onOpenPost, onGoToCalendar }: NextDaysListProps) {
  // Buscar status de entregas do aluno
  const activities = useMemo(
    () => posts.filter(p => ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(p.type)),
    [posts]
  );
  const { activitiesWithDelivery } = useStudentDeliveries(activities);
  
  // Criar mapa rápido de entregas por postId
  const deliveryMap = useMemo(() => {
    const map = new Map<string, { delivered: boolean; status: string }>();
    activitiesWithDelivery.forEach(a => {
      const isDelivered = a.delivery !== null;
      map.set(a.post.id, { 
        delivered: isDelivered, 
        status: a.deliveryStatus 
      });
    });
    return map;
  }, [activitiesWithDelivery]);

  const weekDays = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    const dayGroups: DayGroup[] = days.map(day => {
      const dayPosts = posts.filter(post => {
        const dateToCheck = post.dueAt || post.eventStartAt;
        if (!dateToCheck) return false;
        
        const postDate = new Date(dateToCheck);
        const isCorrectDay = postDate.toDateString() === day.toDateString();
        if (!isCorrectDay) return false;
        
        // Se é atividade, verificar status de entrega
        if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) {
          const deliveryInfo = deliveryMap.get(post.id);
          const isOverdue = post.dueAt && new Date(post.dueAt) < now;
          
          // ✅ OCULTAR: Se já entregou E passou do prazo
          if (deliveryInfo?.delivered && isOverdue) {
            return false;
          }
        }
        
        return true;
      });
      
      let label = format(day, 'dd/MM');
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dayName = dayNames[day.getDay()];
      label = `${dayName}, ${label}`;
      let isSpecial = false;
      
      if (isToday(day)) {
        label = `🔥 HOJE`;
        isSpecial = true;
      } else if (isTomorrow(day)) {
        label = `Amanhã, ${format(day, 'dd/MM')}`;
        isSpecial = true;
      }
      
      return {
        date: day,
        posts: dayPosts,
        label,
        isSpecial
      };
    });
    
    return dayGroups.filter(group => group.posts.length > 0);
  }, [posts, deliveryMap]);

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'PROVA':
        return <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />;
      case 'TRABALHO':
        return <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />;
      case 'ATIVIDADE':
        return <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />;
      case 'EVENTO':
        return <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary" />;
      case 'AVISO':
      case 'COMUNICADO':
        return <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info" />;
      default:
        return <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
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

  if (weekDays.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
        <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
          Semana tranquila!
        </h3>
        <p className="text-sm text-muted-foreground">
          Aproveite para revisar conteúdos passados e se organizar.
        </p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={weekDays.filter(d => d.isSpecial).map(d => d.date.toISOString())} className="space-y-2">
      {weekDays.map((dayGroup) => {
        const hasUrgent = dayGroup.posts.some(p => ['PROVA', 'TRABALHO'].includes(p.type));
        
        return (
          <AccordionItem
            key={dayGroup.date.toISOString()}
            value={dayGroup.date.toISOString()}
            className={cn(
              "glass-card rounded-lg transition-all duration-200",
              dayGroup.isSpecial && isToday(dayGroup.date) 
                ? "border-2 border-[hsl(var(--golden))]/40 bg-gradient-to-br from-[hsl(var(--golden))]/5 to-transparent shadow-[var(--golden-glow)]"
                : "border-border/50"
            )}
          >
            <AccordionTrigger className={cn(
              "px-3 sm:px-4 py-2 sm:py-3 hover:no-underline",
              dayGroup.isSpecial && isToday(dayGroup.date) && "text-[hsl(var(--golden))] font-semibold",
              dayGroup.isSpecial && !isToday(dayGroup.date) && "text-primary font-medium"
            )}>
              <div className="flex items-center justify-between w-full mr-4">
                <span className="text-sm sm:text-base">{dayGroup.label}</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs",
                      hasUrgent && "bg-destructive/10 text-destructive border-destructive/30"
                    )}
                  >
                    {dayGroup.posts.length} {dayGroup.posts.length === 1 ? 'item' : 'itens'}
                  </Badge>
                  {hasUrgent && (
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                </div>
              </div>
            </AccordionTrigger>
          
          <AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="space-y-2">
              {dayGroup.posts.map((post) => (
                <div
                  key={post.id}
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all duration-200",
                    "hover:bg-muted/30 hover:border-primary/30 cursor-pointer",
                    "glass-subtle"
                  )}
                  onClick={() => onOpenPost(post)}
                >
                  <div className={cn(
                    "flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex-shrink-0",
                    getTypeColor(post.type)
                  )}>
                    {getPostIcon(post.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {post.type}
                      </Badge>
                    </div>
                    
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {post.title}
                    </h4>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {post.dueAt || post.eventStartAt 
                            ? format(new Date(post.dueAt || post.eventStartAt!), 'HH:mm')
                            : 'Horário não definido'
                          }
                        </span>
                        {post.dueAt && ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && (
                          deliveryMap.get(post.id)?.delivered ? (
                            <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-medium">
                              <CheckCircle className="h-2.5 w-2.5" />
                              Entregue
                            </span>
                          ) : (
                            <ActivityCountdown dueDate={post.dueAt} size="sm" />
                          )
                        )}
                      </div>
                      {post.classId && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          Turma {post.classId.slice(-4)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 min-w-[44px] px-2 text-xs flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGoToCalendar(post);
                    }}
                  >
                    <Calendar className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Ver</span>
                  </Button>
                </div>
              ))}
            </div>
          </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
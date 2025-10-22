import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isTomorrow } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileText, Bell, BookOpen, AlertCircle } from 'lucide-react';
import { Post } from '@/types/post';
import { cn } from '@/lib/utils';

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
        return postDate.toDateString() === day.toDateString();
      });
      
      let label = format(day, 'dd/MM');
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dayName = dayNames[day.getDay()];
      label = `${dayName}, ${label}`;
      let isSpecial = false;
      
      if (isToday(day)) {
        label = `Hoje, ${format(day, 'dd/MM')}`;
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
  }, [posts]);

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'PROVA':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'TRABALHO':
        return <FileText className="h-4 w-4 text-warning" />;
      case 'ATIVIDADE':
        return <BookOpen className="h-4 w-4 text-primary" />;
      case 'EVENTO':
        return <Calendar className="h-4 w-4 text-secondary" />;
      case 'AVISO':
      case 'COMUNICADO':
        return <Bell className="h-4 w-4 text-info" />;
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

  if (weekDays.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Semana tranquila
        </h3>
        <p className="text-muted-foreground">
          Nenhum evento ou prazo para esta semana.
        </p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-2">
      {weekDays.map((dayGroup) => (
        <AccordionItem
          key={dayGroup.date.toISOString()}
          value={dayGroup.date.toISOString()}
          className="glass-card border-border/50 rounded-lg"
        >
          <AccordionTrigger className={cn(
            "px-4 py-3 hover:no-underline",
            dayGroup.isSpecial && "text-primary font-medium"
          )}>
            <div className="flex items-center justify-between w-full mr-4">
              <span>{dayGroup.label}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {dayGroup.posts.length} {dayGroup.posts.length === 1 ? 'item' : 'itens'}
                </Badge>
                {dayGroup.posts.some(p => ['PROVA', 'TRABALHO'].includes(p.type)) && (
                  <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2">
              {dayGroup.posts.map((post) => (
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
                    </div>
                    
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {post.title}
                    </h4>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {post.dueAt || post.eventStartAt 
                          ? format(new Date(post.dueAt || post.eventStartAt!), 'HH:mm')
                          : 'Horário não definido'
                        }
                      </span>
                      {post.classId && (
                        <span className="text-xs text-muted-foreground">
                          Turma {post.classId.slice(-4)}
                        </span>
                      )}
                    </div>
                  </div>
                  
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
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
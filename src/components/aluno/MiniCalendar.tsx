import { useMemo } from 'react';
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isToday,
  isSameDay,
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Post } from '@/types/post';
import { cn } from '@/lib/utils';

interface MiniCalendarProps {
  posts: Post[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onWeekChange: (date: Date) => void;
  onDayFocus?: (date: Date) => void;
}

export function MiniCalendar({ posts, selectedDate, onDateSelect, onWeekChange, onDayFocus }: MiniCalendarProps) {
  const weekData = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    // Group posts by date
    const postsByDate = new Map<string, Post[]>();
    posts.forEach(post => {
      let dateKey: string | null = null;
      
      if (post.dueAt) {
        dateKey = format(parseISO(post.dueAt), 'yyyy-MM-dd');
      } else if (post.eventStartAt) {
        dateKey = format(parseISO(post.eventStartAt), 'yyyy-MM-dd');
      }
      
      if (dateKey) {
        const existing = postsByDate.get(dateKey) || [];
        postsByDate.set(dateKey, [...existing, post]);
      }
    });

    return { weekStart, weekEnd, weekDays, postsByDate };
  }, [selectedDate, posts]);

  const getEventIndicators = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayPosts = weekData.postsByDate.get(dateKey) || [];
    
    const indicators = [];
    const hasActivity = dayPosts.some(p => ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(p.type));
    const hasEvent = dayPosts.some(p => p.type === 'EVENTO');
    const hasNotice = dayPosts.some(p => ['AVISO', 'COMUNICADO'].includes(p.type));

    if (hasActivity) indicators.push('activity');
    if (hasEvent) indicators.push('event');
    if (hasNotice) indicators.push('notice');

    return indicators;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    onWeekChange(newDate);
  };

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" />
            Semana
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateWeek('prev')}
              className="h-7 w-7 p-0"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateWeek('next')}
              className="h-7 w-7 p-0"
              aria-label="Próxima semana"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-xs text-center text-muted-foreground mb-3">
          {format(weekData.weekStart, "dd 'de' MMM", { locale: ptBR })} - {format(weekData.weekEnd, "dd 'de' MMM", { locale: ptBR })}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, index) => (
            <div 
              key={index} 
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
          
          {/* Days */}
          {weekData.weekDays.map((date, index) => {
            const indicators = getEventIndicators(date);
            const isSelected = isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);
            
            return (
              <Button
                key={index}
                variant="ghost"
                className={cn(
                  "h-10 w-full p-0 text-xs relative hover:bg-primary/10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                  isSelected && "bg-primary/20 text-primary border border-primary/50",
                  isTodayDate && !isSelected && "bg-accent text-accent-foreground font-semibold"
                )}
                onClick={() => onDateSelect(date)}
                onDoubleClick={() => onDayFocus?.(date)}
                aria-label={`${format(date, 'd')} de ${format(date, 'MMMM', { locale: ptBR })}${isTodayDate ? ' (hoje)' : ''}${indicators.length > 0 ? `. ${indicators.length} ${indicators.length === 1 ? 'item' : 'itens'}` : ''}`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span>{format(date, 'd')}</span>
                  {indicators.length > 0 && (
                    <div className="flex gap-0.5">
                      {indicators.includes('activity') && (
                        <div className="w-1 h-1 rounded-full bg-green-400" />
                      )}
                      {indicators.includes('event') && (
                        <div className="w-1 h-1 rounded-full bg-purple-400" />
                      )}
                      {indicators.includes('notice') && (
                        <div className="w-1 h-1 rounded-full bg-blue-400" />
                      )}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Atividades</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Eventos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Avisos</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
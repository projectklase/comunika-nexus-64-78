import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Post } from '@/types/post';
import { cn } from '@/lib/utils';

interface MiniCalendarDashboardProps {
  posts: Post[];
  onDayClick: (date: Date) => void;
  selectedDate?: Date;
}

export function MiniCalendarDashboard({ posts, onDayClick, selectedDate }: MiniCalendarDashboardProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentWeek]);

  const dayData = useMemo(() => {
    return weekDays.map(day => {
      const dayPosts = posts.filter(post => {
        const dateToCheck = post.dueAt || post.eventStartAt;
        if (!dateToCheck) return false;
        
        return isSameDay(new Date(dateToCheck), day);
      });

      const typeGroups = dayPosts.reduce((acc, post) => {
        const category = ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) 
          ? 'activity' 
          : post.type === 'EVENTO' 
          ? 'event' 
          : 'notice';
        
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        date: day,
        posts: dayPosts,
        counts: typeGroups,
        total: dayPosts.length
      };
    });
  }, [weekDays, posts]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const getIndicatorColor = (counts: Record<string, number>) => {
    if (counts.activity > 0) return 'bg-primary';
    if (counts.event > 0) return 'bg-secondary';
    if (counts.notice > 0) return 'bg-info';
    return '';
  };

  const weekLabel = format(weekDays[0], 'dd/MM') + ' - ' + format(weekDays[6], 'dd/MM');

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Mini Calendário
        </CardTitle>
        <CardDescription>
          Visão semanal dos seus compromissos
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateWeek('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm font-medium text-center">
            {weekLabel}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateWeek('next')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((dayLetter, index) => (
            <div key={index} className="text-center text-xs font-medium text-muted-foreground p-1">
              {dayLetter}
            </div>
          ))}
          
          {/* Day Cells */}
          {dayData.map((dayInfo, index) => {
            const dayIsToday = isToday(dayInfo.date);
            const dayIsSelected = selectedDate && isSameDay(dayInfo.date, selectedDate);
            const hasEvents = dayInfo.total > 0;
            
            return (
              <button
                key={index}
                onClick={() => onDayClick(dayInfo.date)}
                className={cn(
                  "relative aspect-square p-1 text-xs rounded-lg transition-all duration-200",
                  "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                  dayIsToday && "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30",
                  dayIsSelected && "bg-primary/20 ring-2 ring-primary/50",
                  !dayIsToday && !dayIsSelected && "text-foreground hover:text-primary"
                )}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span>{format(dayInfo.date, 'd')}</span>
                  
                  {/* Event Indicators */}
                  {hasEvents && (
                    <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      {dayInfo.total <= 3 ? (
                        // Show individual dots for few events
                        Array.from({ length: Math.min(dayInfo.total, 3) }).map((_, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "w-1 h-1 rounded-full",
                              getIndicatorColor(dayInfo.counts) || "bg-muted-foreground/50"
                            )} 
                          />
                        ))
                      ) : (
                        // Show single badge for many events
                        <Badge 
                          variant="secondary" 
                          className="h-3 px-1 text-[10px] leading-none"
                        >
                          {dayInfo.total}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full" />
            Atividades
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-secondary rounded-full" />
            Eventos
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-info rounded-full" />
            Avisos
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useMemo } from 'react';
import { format, addDays, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, Clock } from 'lucide-react';
import { WhatIfSlider } from './WhatIfSlider';
import { EmptyState } from './EmptyStates';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePosts } from '@/hooks/usePosts';
import { Post } from '@/types/post';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type ZoomLevel = 'day' | 'week' | 'month';

export function TimelineSection() {
  const [startDate, setStartDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  
  const allPosts = usePosts({ status: 'PUBLISHED' });

  // Get activities with due dates in the next 30 days
  const timelineActivities = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);
    
    return allPosts
      .filter(post => 
        ['ATIVIDADE', 'TRABALHO', 'PROVA', 'EVENTO'].includes(post.type) && 
        (post.dueAt || post.eventStartAt)
      )
      .filter(post => {
        const targetDate = parseISO(post.dueAt || post.eventStartAt!);
        return targetDate >= now && targetDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => {
        const aDate = new Date(a.dueAt || a.eventStartAt!);
        const bDate = new Date(b.dueAt || b.eventStartAt!);
        return aDate.getTime() - bDate.getTime();
      });
  }, [allPosts]);

  // Generate timeline dates based on zoom level
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const daysToShow = zoomLevel === 'day' ? 7 : zoomLevel === 'week' ? 21 : 30;
    
    for (let i = 0; i < daysToShow; i++) {
      dates.push(addDays(startDate, i));
    }
    
    return dates;
  }, [startDate, zoomLevel]);

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    const grouped: Record<string, Post[]> = {};
    
    timelineActivities.forEach(activity => {
      const activityDate = new Date(activity.dueAt || activity.eventStartAt!);
      const dateKey = format(activityDate, 'yyyy-MM-dd');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    });
    
    return grouped;
  }, [timelineActivities]);

  const handlePrevious = () => {
    const daysToMove = zoomLevel === 'day' ? 1 : zoomLevel === 'week' ? 7 : 14;
    setStartDate(prev => addDays(prev, -daysToMove));
  };

  const handleNext = () => {
    const daysToMove = zoomLevel === 'day' ? 1 : zoomLevel === 'week' ? 7 : 14;
    setStartDate(prev => addDays(prev, daysToMove));
  };

  const handleZoomIn = () => {
    const zoomSequence: ZoomLevel[] = ['month', 'week', 'day'];
    const currentIndex = zoomSequence.indexOf(zoomLevel);
    if (currentIndex < zoomSequence.length - 1) {
      setZoomLevel(zoomSequence[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const zoomSequence: ZoomLevel[] = ['day', 'week', 'month'];
    const currentIndex = zoomSequence.indexOf(zoomLevel);
    if (currentIndex < zoomSequence.length - 1) {
      setZoomLevel(zoomSequence[currentIndex + 1]);
    }
  };

  const handleActivityClick = (activity: Post) => {
    toast({
      title: 'Detalhes da atividade',
      description: `Abrindo detalhes de "${activity.title}"`
    });
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'PROVA':
        return 'border-red-500/30 bg-red-500/10 text-red-400';
      case 'TRABALHO':
        return 'border-orange-500/30 bg-orange-500/10 text-orange-400';
      case 'ATIVIDADE':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
      case 'EVENTO':
        return 'border-green-500/30 bg-green-500/10 text-green-400';
      default:
        return 'border-muted/30 bg-muted/10 text-muted-foreground';
    }
  };

  const formatDateHeader = (date: Date) => {
    switch (zoomLevel) {
      case 'day':
        return format(date, "EEE, dd 'de' MMM", { locale: ptBR });
      case 'week':
        return format(date, "dd/MM", { locale: ptBR });
      case 'month':
        return format(date, "dd", { locale: ptBR });
      default:
        return format(date, "dd/MM", { locale: ptBR });
    }
  };

  return (
    <div className="space-y-6">
      {/* What-If Slider */}
      <WhatIfSlider />
      
      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium min-w-[200px] text-center">
            {format(startDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoomLevel === 'month'}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Badge variant="secondary" className="text-xs">
            {zoomLevel === 'day' ? 'Dia' : zoomLevel === 'week' ? 'Semana' : 'Mês'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoomLevel === 'day'}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-0 top-8 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent z-0" />
        
        <div className="space-y-4 relative z-10">
          {timelineDates.map((date, index) => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const activitiesForDate = activitiesByDate[dateKey] || [];
            const isToday = isSameDay(date, new Date());
            
            return (
              <div key={dateKey} className="flex items-start gap-4">
                {/* Date Marker */}
                <div className="flex-shrink-0 w-16 text-right">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {formatDateHeader(date)}
                  </div>
                  {isToday && (
                    <div className="text-xs text-primary font-bold">
                      HOJE
                    </div>
                  )}
                </div>

                {/* Timeline Dot */}
                <div className="flex-shrink-0 relative">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full border-2 bg-background",
                      isToday
                        ? "border-primary bg-primary"
                        : activitiesForDate.length > 0
                        ? "border-primary/50"
                        : "border-border"
                    )}
                  />
                  {isToday && (
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-primary animate-ping opacity-30" />
                  )}
                </div>

                {/* Activities */}
                <div className="flex-1 min-w-0 space-y-2">
                  {activitiesForDate.length === 0 ? (
                    isToday ? (
                      <div className="text-xs text-muted-foreground py-1">
                        Nada agendado para hoje
                      </div>
                    ) : null
                  ) : (
                    activitiesForDate.map(activity => (
                      <Card
                        key={activity.id}
                        className={cn(
                          "glass-card cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                          getActivityColor(activity.type)
                        )}
                        onClick={() => handleActivityClick(activity)}
                      >
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-medium text-foreground truncate">
                                {activity.title}
                              </h4>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {activity.type}
                              </Badge>
                            </div>
                            
                            {activity.classIds?.[0] && (
                              <p className="text-xs text-muted-foreground">
                                Turma: {activity.classIds[0]}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {(activity.dueAt || activity.eventStartAt) && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(
                                    parseISO(activity.dueAt || activity.eventStartAt!),
                                    'HH:mm',
                                    { locale: ptBR }
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary or Empty State */}
      {timelineActivities.length === 0 ? (
        <EmptyState variant="timeline" />
      ) : (
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">
                Próximos 30 dias
              </div>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>
                    {timelineActivities.filter(a => a.type === 'PROVA').length} Provas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>
                    {timelineActivities.filter(a => a.type === 'TRABALHO').length} Trabalhos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>
                    {timelineActivities.filter(a => a.type === 'ATIVIDADE').length} Atividades
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>
                    {timelineActivities.filter(a => a.type === 'EVENTO').length} Eventos
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
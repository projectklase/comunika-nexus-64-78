import { useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStudentPlannerStore } from '@/stores/studentPlannerStore';
import { usePosts } from '@/hooks/usePosts';
import { cn } from '@/lib/utils';

interface DayLoad {
  date: string;
  morning: number;
  afternoon: number;
  evening: number;
  total: number;
}

interface TimeRibbonProps {
  currentWeek: Date;
  highlightOptimalSlots?: boolean;
  dragDate?: string;
  dragTime?: string;
}

export function TimeRibbon({ currentWeek, highlightOptimalSlots = false, dragDate, dragTime }: TimeRibbonProps) {
  const { getBlocksForWeek } = useStudentPlannerStore();
  const { posts: allPosts } = usePosts({ status: 'PUBLISHED' });

  // Get class events for the week
  const weekEvents = useMemo(() => {
    const weekStart = format(currentWeek, 'yyyy-MM-dd');
    const weekEnd = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
    
    return allPosts.filter(post => 
      post.type === 'EVENTO' && 
      post.eventStartAt &&
      post.eventStartAt >= weekStart &&
      post.eventStartAt <= weekEnd + 'T23:59:59'
    );
  }, [allPosts, currentWeek]);

  // Calculate load for each day
  const weekLoad = useMemo((): DayLoad[] => {
    const weekStartDate = format(currentWeek, 'yyyy-MM-dd');
    const blocks = getBlocksForWeek(weekStartDate);
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(currentWeek, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Count planned blocks by time period
      const dayBlocks = blocks.filter(block => block.date === dateStr);
      const dayEvents = weekEvents.filter(event => {
        const eventDate = event.eventStartAt?.split('T')[0];
        return eventDate === dateStr;
      });
      
      let morning = 0, afternoon = 0, evening = 0;
      
      // Count planned blocks
      dayBlocks.forEach(block => {
        const hour = parseInt(block.startTime.split(':')[0]);
        if (hour >= 6 && hour < 12) morning++;
        else if (hour >= 12 && hour < 18) afternoon++;
        else if (hour >= 18 && hour < 24) evening++;
      });
      
      // Count class events
      dayEvents.forEach(event => {
        if (event.eventStartAt) {
          const hour = parseInt(event.eventStartAt.split('T')[1].split(':')[0]);
          if (hour >= 6 && hour < 12) morning++;
          else if (hour >= 12 && hour < 18) afternoon++;
          else if (hour >= 18 && hour < 24) evening++;
        }
      });
      
      const total = morning + afternoon + evening;
      
      return {
        date: dateStr,
        morning,
        afternoon,
        evening,
        total
      };
    });
  }, [currentWeek, getBlocksForWeek, weekEvents]);

  // Calculate optimal slots for drag suggestion
  const optimalSlots = useMemo(() => {
    if (!highlightOptimalSlots || !dragTime) return new Set<string>();
    
    const dragHour = parseInt(dragTime.split(':')[0]);
    let targetPeriod: 'morning' | 'afternoon' | 'evening';
    
    if (dragHour >= 6 && dragHour < 12) targetPeriod = 'morning';
    else if (dragHour >= 12 && dragHour < 18) targetPeriod = 'afternoon';
    else targetPeriod = 'evening';
    
    // Find days with lowest load in the same period
    const loads = weekLoad.map(day => ({ date: day.date, load: day[targetPeriod] }));
    const minLoad = Math.min(...loads.map(l => l.load));
    
    return new Set(loads.filter(l => l.load === minLoad).map(l => l.date));
  }, [highlightOptimalSlots, dragTime, weekLoad]);

  const getLoadIntensity = (load: number): string => {
    if (load === 0) return 'opacity-20';
    if (load <= 2) return 'opacity-40';
    if (load <= 4) return 'opacity-60';
    if (load <= 6) return 'opacity-80';
    return 'opacity-100';
  };

  const getLoadColor = (load: number): string => {
    if (load === 0) return 'bg-muted';
    if (load <= 2) return 'bg-green-500';
    if (load <= 4) return 'bg-yellow-500';
    if (load <= 6) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLoadText = (load: number): string => {
    if (load === 0) return 'Livre';
    if (load <= 2) return 'Leve';
    if (load <= 4) return 'Média';
    if (load <= 6) return 'Alta';
    return 'Intensa';
  };

  return (
    <div className="w-full mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-foreground">Carga Semanal</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-green-500 opacity-60" />
            <span>Leve</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-yellow-500 opacity-60" />
            <span>Média</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-red-500 opacity-80" />
            <span>Alta</span>
          </div>
        </div>
      </div>

      {/* Heat Map */}
      <div className="grid grid-cols-7 gap-1 p-3 glass-card rounded-lg border border-border/50">
        {weekLoad.map((dayLoad, index) => {
          const isToday = format(new Date(), 'yyyy-MM-dd') === dayLoad.date;
          const isOptimal = optimalSlots.has(dayLoad.date);
          const isDragTarget = dragDate === dayLoad.date;
          
          return (
            <div key={dayLoad.date} className="space-y-1">
              {/* Day Label */}
              <div className={cn(
                "text-xs text-center font-medium",
                isToday ? "text-primary" : "text-muted-foreground"
              )}>
                {format(addDays(currentWeek, index), "EEE", { locale: ptBR })}
              </div>
              
              {/* Time Periods */}
              <div className="space-y-0.5">
                {/* Morning */}
                <div
                  className={cn(
                    "h-2 rounded-sm transition-all duration-200",
                    getLoadColor(dayLoad.morning),
                    getLoadIntensity(dayLoad.morning),
                    isOptimal && "ring-2 ring-primary/50 ring-offset-1",
                    isDragTarget && "animate-pulse ring-2 ring-accent"
                  )}
                  title={`Manhã: ${getLoadText(dayLoad.morning)} (${dayLoad.morning})`}
                />
                
                {/* Afternoon */}
                <div
                  className={cn(
                    "h-2 rounded-sm transition-all duration-200",
                    getLoadColor(dayLoad.afternoon),
                    getLoadIntensity(dayLoad.afternoon),
                    isOptimal && "ring-2 ring-primary/50 ring-offset-1",
                    isDragTarget && "animate-pulse ring-2 ring-accent"
                  )}
                  title={`Tarde: ${getLoadText(dayLoad.afternoon)} (${dayLoad.afternoon})`}
                />
                
                {/* Evening */}
                <div
                  className={cn(
                    "h-2 rounded-sm transition-all duration-200",
                    getLoadColor(dayLoad.evening),
                    getLoadIntensity(dayLoad.evening),
                    isOptimal && "ring-2 ring-primary/50 ring-offset-1",
                    isDragTarget && "animate-pulse ring-2 ring-accent"
                  )}
                  title={`Noite: ${getLoadText(dayLoad.evening)} (${dayLoad.evening})`}
                />
              </div>
              
              {/* Total Load Indicator */}
              <div className="text-center">
                <div
                  className={cn(
                    "w-4 h-1 mx-auto rounded-full transition-all duration-200",
                    getLoadColor(dayLoad.total),
                    getLoadIntensity(dayLoad.total),
                    isOptimal && "ring-1 ring-primary/30"
                  )}
                  title={`Total: ${getLoadText(dayLoad.total)} (${dayLoad.total})`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Magnetic Guidance */}
      {highlightOptimalSlots && optimalSlots.size > 0 && (
        <div className="mt-2 text-xs text-center text-primary animate-pulse">
          ✨ Slots otimizados destacados
        </div>
      )}
    </div>
  );
}
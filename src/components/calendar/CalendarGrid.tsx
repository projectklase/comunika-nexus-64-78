import { useState, useEffect } from 'react';
import { CalendarEvent, useCalendarData } from '@/hooks/useCalendarData';
import { EventChip } from './EventChip';
import { EventOverflowPopover } from './EventOverflowPopover';

import { DayDrawer } from './DayDrawer';
import { ActivityDrawer } from './ActivityDrawer';
import { DaySummarySheet } from './DaySummarySheet';
import { DayFocusModal } from './DayFocusModal';
import { getBrHolidays, Holiday, isHoliday } from '@/utils/br-holidays';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarLayout, LAYOUT_TOKENS } from '@/hooks/useCalendarLayout';
import { sortCalendarEvents } from '@/utils/calendar-sorting';
import { computeDayItems, getOverflowText, getOverflowAriaLabel } from '@/utils/calendar-day-items';
import { countDayActivities, getDayActivitiesForStudent } from '@/utils/day-activity-counter';
import { postStore } from '@/stores/post-store';
import { useActivityDrawerState, useDayDrawerState } from '@/hooks/useActivityDrawerState';
import { restoreActivityDrawerFromUrl, closeActivityDrawer } from '@/utils/activity-drawer-handler';
import { useDayFocusModal } from '@/hooks/useDayFocusModal';
import { useNavigate } from 'react-router-dom';
import { validateDndOperation, DndRuleResult } from '@/utils/calendar-dnd-rules';
import { AuditService } from '@/services/audit-service';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addHours,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface CalendarGridProps {
  currentDate: Date;
  view: 'month' | 'week';
  showHolidays: boolean;
  activeFilters: {
    events: boolean;
    deadlines: boolean;
  };
  classId?: string; // For professor class filtering
}

export function CalendarGrid({ currentDate, view, showHolidays, activeFilters, classId }: CalendarGridProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDaySummary, setShowDaySummary] = useState(false);
  const [summaryDate, setSummaryDate] = useState<Date | null>(null);
  const { openModal: openDayFocusModal } = useDayFocusModal();
  const { 
    pillHeight, 
    maxCellHeight, 
    getVisiblePerDay,
    screenSize,
    isMobile,
    isTablet,
    containerPadding,
    gridColumns
  } = useCalendarLayout();
  
  // Use stores for drawer states
  const activityDrawerState = useActivityDrawerState();
  const dayDrawerState = useDayDrawerState();
  
  // Restore activity drawer from URL on mount
  useEffect(() => {
    const restored = restoreActivityDrawerFromUrl();
    // If restored from URL, don't show day drawer
    if (restored) {
      // Position calendar on the specified date if provided
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get('d');
      if (dateParam) {
        const date = new Date(dateParam);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
        }
      }
    }

    // Check for day summary deep-link
    const params = new URLSearchParams(window.location.search);
    const dayParam = params.get('day');
    const summaryParam = params.get('summary');
    
    if (dayParam && summaryParam === '1' && user?.role === 'aluno') {
      const summaryDateValue = new Date(dayParam);
      if (!isNaN(summaryDateValue.getTime())) {
        setSummaryDate(summaryDateValue);
        setShowDaySummary(true);
      }
    }
  }, [user?.role]);

  // Calculate date range based on view
  const startDate = view === 'month' 
    ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
    : startOfWeek(currentDate, { weekStartsOn: 0 });
  
  const endDate = view === 'month'
    ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
    : endOfWeek(currentDate, { weekStartsOn: 0 });

  const { events, posts } = useCalendarData(startDate, endDate, { classId });
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const holidays = showHolidays ? getBrHolidays(currentDate.getFullYear()) : [];

  // Helper function to get week index for a day
  const getWeekIndex = (day: Date): number => {
    const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });
    const dayWeekStart = startOfWeek(day, { weekStartsOn: 0 });
    return Math.floor((dayWeekStart.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  };

  // Convert existing CalendarEvent[] to NormalizedCalendarEvent[] for unified handling
  const normalizedEvents = events.map(event => ({
    id: event.id,
    postId: event.post.id,
    type: event.type,
    subtype: event.post.type,
    status: event.post.status,
    title: event.post.title,
    startDate: event.startDate,
    endDate: event.endDate,
    clickable: ['professor', 'secretaria'].includes(user?.role || '') || event.post.status === 'PUBLISHED',
    classId: event.post.classId || event.post.classIds?.[0],
    classIds: event.post.classIds,
    meta: {
      title: event.post.title,
      author: event.post.authorName,
      attachments: event.post.attachments,
      weight: event.post.activityMeta?.peso,
      body: event.post.body,
      dueAt: event.post.dueAt,
      eventStartAt: event.post.eventStartAt,
      eventEndAt: event.post.eventEndAt,
      eventLocation: event.post.eventLocation,
      audience: event.post.audience,
      activityMeta: event.post.activityMeta,
    }
  }));

  // Filter events based on active filters
  const filteredEvents = normalizedEvents.filter(event => {
    if (event.type === 'event' && !activeFilters.events) return false;
    if (event.type === 'deadline' && !activeFilters.deadlines) return false;
    return true;
  });

  const handleDayClick = (date: Date) => {
    try {
      // Close activity drawer when day is clicked
      if (activityDrawerState.isOpen) {
        closeActivityDrawer(navigate);
        return; // Don't open day modal if we're just closing drawer
      }

      // Open day focus modal directly
      openDayFocusModal(date);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error handling day click:', error);
      }
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível abrir os detalhes do dia.',
      });
    }
  };

  // Helper function to check if user can move an event/activity
  const canUserMovePost = (post: any): boolean => {
    if (!user) return false;
    
    // Secretaria can move anything created by other secretaria members
    if (user.role === 'secretaria') {
      // Check if the post was created by a secretaria member
      // We determine this by checking if the author name matches a known secretaria pattern
      // or if it's a global post (which are typically created by secretaria)
      const isSecretariaPost = post.authorName === 'Secretaria Central' || 
                              post.authorName?.includes('Secretaria') ||
                              post.audience === 'GLOBAL';
      return isSecretariaPost;
    }
    
    // Professor can only move posts they created themselves
    if (user.role === 'professor') {
      return post.authorName === user.name;
    }
    
    // Students cannot move anything
    return false;
  };

  const handleEventDrop = (e: React.DragEvent<HTMLDivElement>, targetDate: Date) => {
    try {
      e.preventDefault();
      
      const eventId = e.dataTransfer.getData('text/plain');
      console.log('Dragged event ID:', eventId);
      
      if (!eventId) {
        console.warn('No event ID found in drag data');
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível identificar o evento arrastado.',
        });
        return;
      }

      // Find event by postId since that's what we're dragging
      const event = events.find(e => e.post.id === eventId);
      
      console.log('Found event:', event);
      
      if (!event) {
        console.warn('Event not found:', eventId, 'Available events:', events.map(e => ({id: e.id, postId: e.post.id})));
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Evento não encontrado.',
        });
        return;
      }

      // Check permissions
      if (!canUserMovePost(event.post)) {
        const message = user?.role === 'professor' 
          ? 'Você só pode mover atividades criadas por você.'
          : 'Você não tem permissão para mover este item.';
        
        toast({
          variant: 'destructive',
          title: 'Acesso negado',
          description: message,
        });
        return;
      }

      // Validate drag and drop rules
      const originalDate = event.startDate;
      const dndResult: DndRuleResult = validateDndOperation(
        event.post.type, 
        originalDate, 
        targetDate
      );

      // If not allowed, show error and return
      if (!dndResult.allowed) {
        toast({
          variant: 'destructive',
          title: 'Operação não permitida',
          description: dndResult.error || 'Não é possível mover para esta data.',
        });
        
        if (user) {
          AuditService.trackDndBlocked(user.id, {
            postType: event.post.type,
            targetDate: targetDate.toISOString(),
            reason: dndResult.error || 'Unknown'
          });
        }
        return;
      }

      let updateData: any = {};
      let successMessage = '';

      // Handle different post types
      if (event.post.type === 'EVENTO') {
        // Calculate time difference to maintain relative timing
        const originalStart = event.startDate;
        const targetStart = new Date(targetDate);
        targetStart.setHours(originalStart.getHours(), originalStart.getMinutes());

        const duration = event.endDate.getTime() - event.startDate.getTime();
        const targetEnd = new Date(targetStart.getTime() + duration);

        updateData = {
          eventStartAt: targetStart.toISOString(),
          eventEndAt: targetEnd.toISOString()
        };
        successMessage = `${event.post.title} foi movido para ${format(targetStart, 'd/MM/yyyy HH:mm', { locale: ptBR })}`;
      } else if (['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(event.post.type)) {
        // For activities, maintain the time but change the date
        const originalDue = event.startDate; // startDate is the due date for activities
        const targetDue = new Date(targetDate);
        targetDue.setHours(originalDue.getHours(), originalDue.getMinutes());

        updateData = {
          dueAt: targetDue.toISOString()
        };
        successMessage = `${event.post.title} teve o prazo alterado para ${format(targetDue, 'd/MM/yyyy HH:mm', { locale: ptBR })}`;
      } else {
        toast({
          variant: 'destructive',
          title: 'Operação não permitida',
          description: 'Este tipo de item não pode ser movido.',
        });
        return;
      }

      console.log('Updating post:', event.post.id, 'with data:', updateData);

      // Update post in store using the post ID, not the event ID
      const updated = postStore.update(event.post.id, updateData);

      if (updated) {
        // Show appropriate toast based on DnD result
        if (dndResult.shouldShowToast && dndResult.toastMessage) {
          toast({
            variant: (dndResult.toastVariant === 'warning' ? 'destructive' : 'default') as 'default' | 'destructive',
            title: dndResult.toastVariant === 'warning' ? 'Aviso' : 'Sucesso',
            description: dndResult.toastMessage,
          });
        } else {
          toast({
            title: 'Item movido com sucesso',
            description: successMessage,
          });
        }
        
        // Track successful move
        if (user) {
          const isPast = targetDate < startOfDay(new Date());
          AuditService.trackDndMoved(user.id, {
            postType: event.post.type,
            fromDate: originalDate.toISOString(),
            toDate: targetDate.toISOString(),
            isPast
          });
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to update post in store');
        }
        toast({
          variant: 'destructive',
          title: 'Erro ao mover item',
          description: 'Não foi possível mover o item. Tente novamente.',
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error handling event drop:', error);
      }
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao mover o item.',
      });
    }
  };

  // Centralized day items computation
  const computeEventsForDay = (date: Date, weekIndex: number) => {
    const visibleLimit = getVisiblePerDay(weekIndex);
    return computeDayItems(date, filteredEvents, {
      activeFilters,
      visibleLimit
    });
  };

  const getHolidayForDay = (date: Date): Holiday | null => {
    if (!showHolidays) return null;
    return isHoliday(date, currentDate.getFullYear());
  };

  const selectedDateHoliday = selectedDate ? getHolidayForDay(selectedDate) : null;

  return (
    <>
      <div className="glass-card rounded-lg p-6">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div 
              key={day} 
              className="p-3 text-center text-sm font-medium text-muted-foreground border-b border-border/30"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className={cn(
          "grid grid-cols-7 gap-1",
          view === 'week' ? "grid-rows-1" : "grid-rows-6"
        )}>
          {days.map((day, dayIndex) => {
            const holiday = getHolidayForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const weekIndex = getWeekIndex(day);
            const isLastDayOfWeek = dayIndex % 7 === 6;
            
            // Compute day items using centralized logic
            const dayItemsData = computeEventsForDay(day, weekIndex);
            
            return (
              <div key={day.toISOString()} className="relative">
                <div
                  className={cn(
                    "border border-border/20 rounded-lg",
                    "cursor-pointer transition-all duration-200",
                    "hover:bg-accent/20 hover:border-accent/40",
                    isCurrentDay && "ring-2 ring-primary/50 bg-primary/5",
                    !isCurrentMonth && "opacity-50",
                    holiday && "bg-amber-500/5 border-amber-500/20",
                    // Dynamic heights based on layout tokens
                    isMobile && "min-h-[var(--calendar-cell-min-height)] p-1",
                    isTablet && "min-h-[100px] p-2",
                    !isMobile && !isTablet && "min-h-[120px] p-2"
                  )}
                  style={{ 
                    minHeight: isMobile ? '80px' : '100px'
                  }}
                  onClick={() => handleDayClick(day)}
                  aria-label={`Dia ${format(day, 'd')}, clique para ver detalhes do dia`}
                  onDragOver={user?.role !== 'aluno' ? (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    // Add visual feedback on drag over
                    const element = e.currentTarget;
                    element.classList.add('ring-2', 'ring-primary/50', 'bg-primary/5', 'scale-[1.02]', 'transition-all', 'duration-200');
                  } : undefined}
                  onDragLeave={user?.role !== 'aluno' ? (e) => {
                    // Remove visual feedback when drag leaves
                    const element = e.currentTarget;
                    element.classList.remove('ring-2', 'ring-primary/50', 'bg-primary/5', 'scale-[1.02]', 'transition-all', 'duration-200');
                  } : undefined}
                  onDrop={user?.role !== 'aluno' ? (e) => {
                    // Remove visual feedback after drop
                    const element = e.currentTarget;
                    element.classList.remove('ring-2', 'ring-primary/50', 'bg-primary/5', 'scale-[1.02]', 'transition-all', 'duration-200');
                    handleEventDrop(e, day);
                  } : undefined}
                >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm font-medium",
                    isCurrentDay && "text-primary font-bold",
                    holiday && "text-amber-400"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {holiday && (
                    <div className="w-2 h-2 rounded-full bg-amber-400/60" title={holiday.name} />
                  )}
                </div>

                  <div 
                    className="space-y-0.5 overflow-hidden"
                    style={{ 
                      maxHeight: `${Math.min(maxCellHeight, 80)}px` 
                    }}
                  >
                    {/* Render visible items */}
                    {dayItemsData.visibleItems.map(event => {
                      // Ensure valid event data
                      if (!event || !event.id || !event.meta) {
                        console.warn('Invalid event data:', event);
                        return null;
                      }

                      // Determine if event can be dragged based on user permissions
                      const isDraggableEvent = user && user.role !== 'aluno' ? (() => {
                        // Only allow dragging of actual posts (not holidays or other items)
                        if (!['EVENTO', 'ATIVIDADE', 'TRABALHO', 'PROVA'].includes(event.subtype)) {
                          return false;
                        }
                        
                       // Use the permission function
                        const post = {
                          authorName: event.meta.author,
                          type: event.subtype,
                          audience: event.meta.audience
                        };
                        return canUserMovePost(post);
                      })() : false;
                      
                      console.log('Rendering event:', event.meta.title, 'isDraggable:', isDraggableEvent, 'subtype:', event.subtype, 'author:', event.meta.author, 'user:', user?.name);
                      
                      return (
                        <EventChip
                          key={`event-${String(event.id)}`}
                          event={event}
                          isDraggable={isDraggableEvent}
                          className="text-xs"
                          useUnifiedHandler={true}
                        />
                      );
                    }).filter(Boolean)}
                    
                    {/* Render overflow button if needed */}
                    {dayItemsData.hasOverflow && (
                      <EventOverflowPopover
                        events={dayItemsData.allItems}
                        overflowCount={dayItemsData.overflowCount}
                        visibleCount={dayItemsData.visibleItems.length}
                        date={day}
                        className="text-xs"
                        isMobile={isMobile}
                      />
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
        
      </div>

      {/* Only show DayDrawer when ActivityDrawer is not open */}
      {!activityDrawerState.isOpen && (
        <DayDrawer
          isOpen={dayDrawerState.isOpen}
          onClose={() => {}}
          selectedDate={selectedDate}
          events={[]} // Legacy events, will be empty
          holiday={selectedDateHoliday}
        />
      )}

      <ActivityDrawer
        postId={activityDrawerState.postId}
        classId={activityDrawerState.classId}
        isOpen={activityDrawerState.isOpen}
        onClose={() => closeActivityDrawer(navigate)}
      />

      {/* Day Summary Sheet for Students */}
      {user?.role === 'aluno' && summaryDate && (
        <DaySummarySheet
          isOpen={showDaySummary}
          onClose={() => {
            setShowDaySummary(false);
            setSummaryDate(null);
            // Clean up URL params if they exist
            const params = new URLSearchParams(window.location.search);
            if (params.get('summary') === '1') {
              params.delete('day');
              params.delete('summary');
              const queryString = params.toString();
              navigate(queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname, { replace: true });
            }
          }}
          date={summaryDate}
          activities={getDayActivitiesForStudent(summaryDate, posts, activeFilters)}
          isMobile={isMobile}
        />
      )}

      {/* Day Focus Modal */}
      <DayFocusModal />
    </>
  );
}
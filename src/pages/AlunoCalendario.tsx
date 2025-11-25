import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { MobileCalendarSheet } from '@/components/calendar/MobileCalendarSheet';
import { CalendarModalProvider } from '@/components/calendar/CalendarModalManager';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useUnifiedCalendarFocus } from '@/hooks/useUnifiedCalendarFocus';
import { useSelectState, DEFAULT_SELECT_TOKENS, safeRestoreSelectValue, SelectToken } from '@/hooks/useSelectState';
import { useIsMobile } from '@/hooks/use-mobile';
import { RESPONSIVE_CLASSES } from '@/lib/responsive-utils';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Grid3X3,
  Rows4
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AlunoCalendario() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isMountedRef = useRef(true);
  const isMobile = useIsMobile();
  
  // Redirect if not aluno
  if (!user || user.role !== 'aluno') {
    return <Navigate to="/login" replace />;
  }

  // Parse URL parameters
  const getDateFromParams = (): Date => {
    const dateParam = searchParams.get('d');
    if (dateParam) {
      try {
        const parsedDate = parseISO(dateParam);
        if (isValid(parsedDate)) return parsedDate;
      } catch {
        // Fall through to default
      }
    }
    return new Date();
  };

  const getViewFromParams = (): 'month' | 'week' => {
    const view = searchParams.get('v');
    return view === 'week' ? 'week' : 'month';
  };

  const getClassIdFromParams = (): SelectToken => {
    const classId = searchParams.get('classId');
    return classId as SelectToken || DEFAULT_SELECT_TOKENS.ALL_CLASSES;
  };

  const getPostIdFromParams = (): string | null => {
    return searchParams.get('postId');
  };

  const [currentDate, setCurrentDate] = useState(getDateFromParams);
  const [view, setView] = useState<'month' | 'week'>(getViewFromParams);
  const [showHolidays, setShowHolidays] = useState(true);
  const [activeFilters, setActiveFilters] = useState({
    events: true,
    deadlines: true
  });
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(getPostIdFromParams);

  // Class filter state
  const classFilter = useSelectState({ 
    defaultToken: getClassIdFromParams(),
    onValueChange: (value) => {
      // Update URL param when class changes
      const newParams = new URLSearchParams(searchParams);
      if (value === DEFAULT_SELECT_TOKENS.ALL_CLASSES) {
        newParams.delete('classId');
      } else {
        newParams.set('classId', value);
      }
      setSearchParams(newParams, { replace: true });
    }
  });

  // Update state when URL changes (only if still on calendar route)
  useEffect(() => {
    // Only process URL params if we're on the aluno calendar route
    if (!location.pathname.includes('/aluno/calendario')) {
      return;
    }

    // Don't update state if component is unmounting
    if (!isMountedRef.current) {
      return;
    }
    
    const newDate = getDateFromParams();
    const newView = getViewFromParams();
    const newClassId = getClassIdFromParams();
    const newPostId = getPostIdFromParams();
    
    setCurrentDate(newDate);
    setView(newView);
    setHighlightedPostId(newPostId);
    
    // Only update class filter if actually different to prevent loops
    if (classFilter.value !== newClassId) {
      classFilter.setValue(newClassId);
    }
  }, [searchParams.get('d'), searchParams.get('v'), searchParams.get('classId'), searchParams.get('postId'), location.pathname]);

  // Cleanup: mark component as unmounting
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Get data for calendar
  const startDate = view === 'month' 
    ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
    : startOfWeek(currentDate, { weekStartsOn: 0 });
  
  const endDate = view === 'month'
    ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
    : endOfWeek(currentDate, { weekStartsOn: 0 });

  const { events } = useCalendarData(startDate, endDate, {
    classId: classFilter.value === DEFAULT_SELECT_TOKENS.ALL_CLASSES ? undefined : classFilter.value
  });

  // Unified calendar focus hook for navigation from notifications
  useUnifiedCalendarFocus({
    events,
    isLoading: false, // useCalendarData doesn't expose loading state
  });
  
  const eventCount = events.filter(e => e.type === 'event').length;
  const deadlineCount = events.filter(e => e.type === 'deadline').length;

  // Calculate active filters count for mobile badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (!activeFilters.events) count++;
    if (!activeFilters.deadlines) count++;
    if (!showHolidays) count++;
    if (classFilter.value !== DEFAULT_SELECT_TOKENS.ALL_CLASSES) count++;
    return count;
  }, [activeFilters, showHolidays, classFilter.value]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = view === 'month' 
      ? (direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
      : (direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    
    setCurrentDate(newDate);
    
    // Update URL param
    const newParams = new URLSearchParams(searchParams);
    newParams.set('d', format(newDate, 'yyyy-MM-dd'));
    setSearchParams(newParams, { replace: true });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    
    // Update URL param
    const newParams = new URLSearchParams(searchParams);
    newParams.set('d', format(today, 'yyyy-MM-dd'));
    setSearchParams(newParams, { replace: true });
  };

  const handleViewChange = (newView: 'month' | 'week') => {
    setView(newView);
    
    // Update URL param
    const newParams = new URLSearchParams(searchParams);
    if (newView === 'month') {
      newParams.delete('v');
    } else {
      newParams.set('v', newView);
    }
    setSearchParams(newParams, { replace: true });
  };

  const formatDateHeader = () => {
    if (view === 'month') {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(weekStart, 'd MMM', { locale: ptBR })} - ${format(weekEnd, 'd MMM yyyy', { locale: ptBR })}`;
    }
  };

  return (
    <CalendarModalProvider>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header Responsivo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Meu Calendário</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Visualize suas atividades, eventos e prazos
            </p>
          </div>
          
          <Button 
            onClick={goToToday}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className={cn("glass-card border-primary/30", RESPONSIVE_CLASSES.iconButton)}
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="ml-2">Hoje</span>
          </Button>
        </div>

        {/* Filtros - Desktop inline, Mobile Sheet */}
        <div className="hidden sm:block">
          <CalendarFilters
            activeFilters={activeFilters}
            showHolidays={showHolidays}
            selectedClassId={classFilter.value}
            onFilterChange={setActiveFilters}
            onHolidaysToggle={setShowHolidays}
            onClassChange={classFilter.setValue}
            eventCount={eventCount}
            deadlineCount={deadlineCount}
          />
        </div>
        <div className="sm:hidden">
          <MobileCalendarSheet activeFiltersCount={activeFiltersCount}>
            <CalendarFilters
              activeFilters={activeFilters}
              showHolidays={showHolidays}
              selectedClassId={classFilter.value}
              onFilterChange={setActiveFilters}
              onHolidaysToggle={setShowHolidays}
              onClassChange={classFilter.setValue}
              eventCount={eventCount}
              deadlineCount={deadlineCount}
              compact
            />
          </MobileCalendarSheet>
        </div>

        {/* Calendar Card com navegação responsiva */}
        <div className="glass-card rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 sm:mb-6">
            {/* Date Navigation - mais compacta no mobile */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-base sm:text-xl font-semibold text-foreground min-w-[140px] sm:min-w-[200px] text-center">
                {formatDateHeader()}
              </h2>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View Switcher - compacto no mobile */}
            <Tabs value={view} onValueChange={handleViewChange}>
              <TabsList className="glass border border-border/30">
                <TabsTrigger value="month" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                  <Grid3X3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Mês</span>
                </TabsTrigger>
                <TabsTrigger value="week" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                  <Rows4 className="h-4 w-4" />
                  <span className="hidden sm:inline">Semana</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Calendar Grid */}
          <CalendarGrid
            currentDate={currentDate}
            view={view}
            showHolidays={showHolidays}
            activeFilters={activeFilters}
            classId={classFilter.value === DEFAULT_SELECT_TOKENS.ALL_CLASSES ? undefined : classFilter.value}
          />
        </div>
      </div>
    </CalendarModalProvider>
  );
}
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { CalendarModalProvider } from '@/components/calendar/CalendarModalManager';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useUnifiedCalendarFocus } from '@/hooks/useUnifiedCalendarFocus';
import { useSelectState, DEFAULT_SELECT_TOKENS, safeRestoreSelectValue, SelectToken } from '@/hooks/useSelectState';
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
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Meu Calendário</h1>
            <p className="text-muted-foreground">
              Visualize suas atividades, eventos e prazos
            </p>
          </div>
          
          <Button 
            onClick={goToToday}
            variant="outline"
            className="glass-card border-primary/30 hover:bg-primary/20"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Hoje
          </Button>
        </div>

        {/* Filters */}
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

        {/* Calendar Navigation and Views */}
        <div className="glass-card rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            {/* Date Navigation */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-xl font-semibold text-foreground min-w-[200px] text-center">
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

            {/* View Switcher */}
            <Tabs value={view} onValueChange={handleViewChange}>
              <TabsList className="glass border border-border/30">
                <TabsTrigger value="month" className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Mês
                </TabsTrigger>
                <TabsTrigger value="week" className="flex items-center gap-2">
                  <Rows4 className="h-4 w-4" />
                  Semana
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
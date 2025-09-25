import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { CalendarModalProvider } from '@/components/calendar/CalendarModalManager';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useUnifiedCalendarFocus } from '@/hooks/useUnifiedCalendarFocus';
import { useSelectState, DEFAULT_SELECT_TOKENS, safeRestoreSelectValue } from '@/hooks/useSelectState';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Grid3X3,
  Rows4,
  Plus
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
  endOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProfessorCalendar() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Redirect if not professor
  if (!user || user.role !== 'professor') {
    return <Navigate to="/login" replace />;
  }

  // Parse URL parameters safely
  const getDateFromParams = (): Date => {
    const dateParam = searchParams.get('d');
    if (dateParam) {
      try {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
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
  
  const [currentDate, setCurrentDate] = useState(getDateFromParams);
  const [view, setView] = useState<'month' | 'week'>(getViewFromParams);
  const [showHolidays, setShowHolidays] = useState(true);
  const [activeFilters, setActiveFilters] = useState({
    events: true,
    deadlines: true
  });
  
  // Update state when URL changes - prevent infinite loops
  useEffect(() => {
    const newDate = getDateFromParams();
    const newView = getViewFromParams();
    
    setCurrentDate(newDate);
    setView(newView);
  }, [searchParams.get('d'), searchParams.get('v')]);

  // Class filter state with persistence for professor
  const classFilter = useSelectState({ 
    defaultToken: DEFAULT_SELECT_TOKENS.ALL_CLASSES,
    onValueChange: (value) => {
      localStorage.setItem(`cal:professor:${user.id}:selectedClassId`, value);
      
      // Update URL param for class filter
      const newParams = new URLSearchParams(searchParams);
      if (value === DEFAULT_SELECT_TOKENS.ALL_CLASSES) {
        newParams.delete('classId');
      } else {
        newParams.set('classId', value);
      }
      setSearchParams(newParams, { replace: true });
    }
  });

  // Restore class filter from localStorage and URL on mount
  useEffect(() => {
    // Check URL first, then localStorage
    const urlClassId = searchParams.get('classId');
    if (urlClassId) {
      classFilter.setValue(urlClassId);
      return;
    }
    
    const stored = localStorage.getItem(`cal:professor:${user.id}:selectedClassId`);
    const restored = safeRestoreSelectValue(stored, DEFAULT_SELECT_TOKENS.ALL_CLASSES);
    classFilter.setValue(restored);
  }, [user?.id, classFilter]);

  // Get data for counts
  const startDate = view === 'month' 
    ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
    : startOfWeek(currentDate, { weekStartsOn: 0 });
  
  const endDate = view === 'month'
    ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
    : endOfWeek(currentDate, { weekStartsOn: 0 });

  const { events } = useCalendarData(startDate, endDate, {
    classId: classFilter.value !== DEFAULT_SELECT_TOKENS.ALL_CLASSES 
      ? classFilter.value 
      : undefined
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
            <h1 className="text-3xl font-bold gradient-text">Calendário do Professor</h1>
            <p className="text-muted-foreground">
              Visualize suas turmas, atividades e eventos
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="default"
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                // Close any open modals first
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('modal');
                newParams.delete('drawer');
                
                // Update URL to close modals, then navigate
                setSearchParams(newParams, { replace: true });
                
                // Navigate after a brief delay to ensure modal closes
                setTimeout(() => {
                  navigate('/professor/atividades/nova');
                }, 100);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
            
            <Button 
              onClick={goToToday}
              variant="outline"
              className="glass-card border-primary/30 hover:bg-primary/20"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Hoje
            </Button>
          </div>
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
            classId={classFilter.value !== DEFAULT_SELECT_TOKENS.ALL_CLASSES 
              ? classFilter.value 
              : undefined}
          />
        </div>

        {/* Tips for Professor */}
        <div className="glass p-4 rounded-lg border border-primary/30">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Você pode arrastar eventos, atividades, trabalhos e provas que você criou para alterar suas datas. Clique em qualquer dia para ver todos os eventos e atividades em detalhes com opções de gerenciamento.
          </p>
        </div>
      </div>
    </CalendarModalProvider>
  );
}
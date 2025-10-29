import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, setMonth, setYear, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { AdvancedCalendarFilters, AdvancedFilters } from '@/components/calendar/AdvancedCalendarFilters';
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary';
import { CalendarModalProvider } from '@/components/calendar/CalendarModalManager';
import { PostComposer } from '@/components/feed/PostComposer';
import { useAdvancedCalendarData } from '@/hooks/useAdvancedCalendarData';
import { useUnifiedCalendarFocus } from '@/hooks/useUnifiedCalendarFocus';
import { useStoreInitialization } from '@/hooks/useStoreInitialization';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { postStore } from '@/stores/post-store';
import { PostInput, PostType } from '@/types/post';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Grid3X3,
  Rows4,
  Plus,
  Settings
} from 'lucide-react';

export default function SecretariaCalendar() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Initialize stores once
  useStoreInitialization();
  
  // Redirect if not secretaria
  if (!user || user.role !== 'secretaria') {
    return <Navigate to="/login" replace />;
  }

  // Parse URL parameters safely
  const getDateFromParams = (): Date => {
    const dateParam = searchParams.get('d');
    if (dateParam) {
      try {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      } catch (error) {
        console.warn('Invalid date parameter:', dateParam, error);
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
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    events: true,
    deadlines: true,
    postTypes: [],
    overdue: false,
    upcoming: false,
    thisWeek: false,
    authorNames: [],
    classIds: [],
    hasWeight: false,
    minWeight: undefined,
    maxWeight: undefined,
    searchQuery: '',
    hasAttachments: false,
    showHolidays: true
  });
  const [showEventComposer, setShowEventComposer] = useState(false);
  const { toast } = useToast();
  
  // Update state when URL changes - prevent infinite loops
  useEffect(() => {
    const newDate = getDateFromParams();
    const newView = getViewFromParams();
    
    // Only update if values are actually different
    if (newDate.getTime() !== currentDate.getTime()) {
      setCurrentDate(newDate);
    }
    
    if (newView !== view) {
      setView(newView);
    }
  }, [searchParams]); // Only depend on searchParams
  
  // Memoize calendar data to prevent unnecessary re-renders
  const calendarData = useAdvancedCalendarData({
    startDate: view === 'month' ? startOfMonth(currentDate) : startOfWeek(currentDate, { weekStartsOn: 0 }),
    endDate: view === 'month' ? endOfMonth(currentDate) : endOfWeek(currentDate, { weekStartsOn: 0 }),
    filters: advancedFilters
  });

  // Handle calendar focus from URL
  useUnifiedCalendarFocus({
    events: calendarData.events,
    isLoading: false
  });

  // Enhanced filter state management with optimistic updates
  const handleFiltersChange = useCallback((filters: AdvancedFilters) => {
    setAdvancedFilters(filters);
  }, []);

  const navigateDate = (direction: 'prev' | 'next') => {
    try {
      const newDate = view === 'month' 
        ? (direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
        : (direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
      
      // Only update URL - the useEffect will update the state
      const newParams = new URLSearchParams(searchParams);
      newParams.set('d', format(newDate, 'yyyy-MM-dd'));
      
      // Remove modal parameters when navigating dates for clean navigation
      newParams.delete('modal');
      newParams.delete('postId');
      
      setSearchParams(newParams, { replace: true });
    } catch (error) {
      console.error('Error navigating date:', error);
    }
  };

  const goToToday = () => {
    try {
      const today = new Date();
      
      // Only update URL - the useEffect will update the state
      const newParams = new URLSearchParams(searchParams);
      newParams.set('d', format(today, 'yyyy-MM-dd'));
      setSearchParams(newParams, { replace: true });
    } catch (error) {
      console.error('Error going to today:', error);
    }
  };

  const handleViewChange = (newView: 'month' | 'week') => {
    try {
      // Only update URL - the useEffect will update the state
      const newParams = new URLSearchParams(searchParams);
      if (newView === 'month') {
        newParams.delete('v'); // Default is month
      } else {
        newParams.set('v', newView);
      }
      setSearchParams(newParams, { replace: true });
    } catch (error) {
      console.error('Error changing view:', error);
    }
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
      <CalendarErrorBoundary>
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">
                Calendário da Secretaria
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie eventos, atividades e prazos de toda a escola
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={goToToday}
                variant="outline" 
                size="sm"
                className="glass border-primary/30 text-primary hover:bg-primary/10"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Hoje
              </Button>
              
              <Button
                onClick={() => setShowEventComposer(true)}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Post
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="glass border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Filtros Avançados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdvancedCalendarFilters
                activeFilters={advancedFilters}
                onFiltersChange={handleFiltersChange}
                eventCount={calendarData.events.filter(e => e.type === 'event').length}
                deadlineCount={calendarData.events.filter(e => e.type === 'deadline').length}
                totalCount={calendarData.events.length}
              />
            </CardContent>
          </Card>

          {/* Calendar Navigation and Grid */}
          <div className="space-y-4">
            {/* Navigation Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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

            {/* Calendar Grid - Secretaria */}
            <CalendarGrid
              currentDate={currentDate}
              view={view}
              showHolidays={advancedFilters.showHolidays}
              activeFilters={{
                events: advancedFilters.events,
                deadlines: advancedFilters.deadlines
              }}
              classId={undefined} // Secretaria vê todas as turmas
            />
          </div>

          {/* Drag and Drop Instructions for Secretaria */}
          <div className="glass p-4 rounded-lg border border-primary/30">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Você pode arrastar eventos (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                📅 EVENTO
              </span>
              ) para mover suas datas. Clique em qualquer dia para ver todos os eventos e atividades em detalhes com opções de gerenciamento.
            </p>
          </div>

          {/* Event Composer Modal */}
          <Dialog open={showEventComposer} onOpenChange={setShowEventComposer}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="gradient-text">
                  Criar Novo Post
                </DialogTitle>
              </DialogHeader>
              <PostComposer
                allowedTypes={['AVISO', 'COMUNICADO', 'EVENTO'] as PostType[]}
                onSubmit={async (postInput: PostInput) => {
                  if (!user) return;
                  
                  await postStore.create(postInput, user.name, user.id, user.role);
                  setShowEventComposer(false);
                  
                  toast({
                    title: "Post criado",
                    description: "O post foi criado com sucesso.",
                  });
                }}
                onCancel={() => setShowEventComposer(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CalendarErrorBoundary>
    </CalendarModalProvider>
  );
}
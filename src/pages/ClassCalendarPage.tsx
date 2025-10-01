import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClassStore } from '@/stores/class-store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClassCalendarGrid } from '@/components/calendar/ClassCalendarGrid';
import { ClassCalendarFilters } from '@/components/calendar/ClassCalendarFilters';
import { useClassCalendarData } from '@/hooks/useClassCalendarData';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Grid3X3,
  Rows4,
  ArrowLeft
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
import { getClassDisplayInfo } from '@/utils/class-helpers';
import { ActivityType } from '@/types/post';
import { useLevels } from '@/hooks/useLevels';
import { useModalities } from '@/hooks/useModalities';

export function ClassCalendarPage() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const { getClass } = useClassStore();
  const { levels } = useLevels();
  const { modalities } = useModalities();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [showScheduled, setShowScheduled] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    types: [] as ActivityType[],
    statuses: [] as string[]
  });

  const classData = classId ? getClass(classId) : null;
  const classInfo = classData ? getClassDisplayInfo(classData, levels, modalities) : null;

  // Get data for the calendar
  const startDate = view === 'month' 
    ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
    : startOfWeek(currentDate, { weekStartsOn: 0 });
  
  const endDate = view === 'month'
    ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
    : endOfWeek(currentDate, { weekStartsOn: 0 });

  const { events, metrics } = useClassCalendarData(classId || '', startDate, endDate, {
    showScheduled: user?.role === 'professor' && showScheduled,
    typeFilters: activeFilters.types,
    statusFilters: activeFilters.statuses
  });

  const navigateDate = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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

  const handleBack = () => {
    const basePath = user?.role === 'professor' ? '/professor' : '/secretaria';
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = `${basePath}/turmas`;
    }
  };

  if (!classData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Turma não encontrada</h1>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleBack}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              Calendário - {classData.name}
            </h1>
            <p className="text-muted-foreground">
              {classInfo?.levelModality} • {classInfo?.schedule}
            </p>
          </div>
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
      <ClassCalendarFilters
        activeFilters={activeFilters}
        showScheduled={showScheduled}
        onFilterChange={setActiveFilters}
        onScheduledToggle={setShowScheduled}
        metrics={metrics}
        userRole={user?.role || 'aluno'}
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
          <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week')}>
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
        <ClassCalendarGrid
          classId={classId || ''}
          currentDate={currentDate}
          view={view}
          events={events}
          userRole={user?.role || 'aluno'}
        />
      </div>
    </div>
  );
}
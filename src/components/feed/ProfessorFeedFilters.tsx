import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  FolderOpen, 
  ClipboardCheck, 
  Calendar as CalendarIcon,
  Clock,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  ProfessorQuickFilter, 
  ProfessorPeriodFilter, 
  useProfessorFeedFilters 
} from '@/hooks/useProfessorFeedFilters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface ProfessorFeedFiltersProps {
  className?: string;
}

const TYPE_FILTERS = [
  { key: 'all' as ProfessorQuickFilter, label: 'Todos', icon: FileText },
  { key: 'atividade' as ProfessorQuickFilter, label: 'Atividades', icon: FileText },
  { key: 'trabalho' as ProfessorQuickFilter, label: 'Trabalhos', icon: FolderOpen },
  { key: 'prova' as ProfessorQuickFilter, label: 'Provas', icon: ClipboardCheck },
  { key: 'eventos' as ProfessorQuickFilter, label: 'Eventos', icon: CalendarIcon },
  { key: 'agendados' as ProfessorQuickFilter, label: 'Agendados', icon: Clock }
];

const PERIOD_FILTERS = [
  { key: 'hoje' as ProfessorPeriodFilter, label: 'Hoje' },
  { key: 'semana' as ProfessorPeriodFilter, label: 'Semana' },
  { key: 'mes' as ProfessorPeriodFilter, label: '30 dias' },
  { key: 'custom' as ProfessorPeriodFilter, label: 'Personalizado' }
];

export function ProfessorFeedFilters({ className }: ProfessorFeedFiltersProps) {
  const {
    filters,
    feedMetrics,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    isCustomRangeOpen,
    setIsCustomRangeOpen,
    applyCustomRange,
    professorClasses
  } = useProfessorFeedFilters();

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
    filters.customRange ? {
      from: filters.customRange.from,
      to: filters.customRange.to
    } : undefined
  );

  const handleTypeFilter = (type: ProfessorQuickFilter) => {
    updateFilters({ type });
  };

  const handlePeriodFilter = (period: ProfessorPeriodFilter) => {
    if (period === 'custom') {
      setIsCustomRangeOpen(true);
    } else {
      updateFilters({ period, customRange: undefined });
    }
  };

  const handleClassFilter = (classId: string) => {
    updateFilters({ classId });
  };

  const handleApplyCustomRange = () => {
    if (selectedRange?.from && selectedRange?.to) {
      applyCustomRange(selectedRange.from, selectedRange.to);
    }
  };

  const getTypeCount = (type: ProfessorQuickFilter): number => {
    return feedMetrics[type];
  };

  return (
    <div className={cn("glass-card rounded-lg p-4 space-y-4 sticky top-4 z-10 backdrop-blur-sm shadow-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Filtros</h3>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="h-7 px-2 text-xs hover:bg-destructive/20 hover:text-destructive"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Type Filters */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Por Tipo
        </h4>
        
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map(filter => {
            const Icon = filter.icon;
            const isActive = filters.type === filter.key;
            const count = getTypeCount(filter.key);
            
            return (
              <Button
                key={filter.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleTypeFilter(filter.key)}
                className={cn(
                  "h-8 text-xs transition-all duration-200",
                  isActive ? "bg-primary/20 border-primary/40 shadow-sm" : "hover:bg-muted/50"
                )}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
              >
                <Icon className="h-3 w-3 mr-1.5" />
                {filter.label}
                <Badge 
                  variant="secondary" 
                  className="ml-2 h-4 px-1.5 text-xs bg-background/50 min-w-[20px] justify-center"
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      <Separator className="bg-border/50" />

      {/* Period Filters */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Por Período
        </h4>
        
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_FILTERS.map(filter => {
            const isActive = filters.period === filter.key;
            
            return (
              <Button
                key={filter.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handlePeriodFilter(filter.key)}
                className={cn(
                  "h-8 text-xs transition-all duration-200",
                  isActive ? "bg-primary/20 border-primary/40 shadow-sm" : "hover:bg-muted/50"
                )}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
              >
                {filter.label}
              </Button>
            );
          })}
        </div>

        {/* Custom Range Display */}
        {filters.period === 'custom' && filters.customRange && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
            {format(filters.customRange.from, "dd 'de' MMM", { locale: ptBR })} - {' '}
            {format(filters.customRange.to, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
          </div>
        )}

        {/* Custom Range Popover */}
        <Popover open={isCustomRangeOpen} onOpenChange={setIsCustomRangeOpen}>
          <PopoverTrigger asChild>
            <div />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 glass-card border-border/50" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Período Personalizado</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCustomRangeOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <Calendar
                mode="range"
                selected={selectedRange}
                onSelect={setSelectedRange}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCustomRangeOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyCustomRange}
                  disabled={!selectedRange?.from || !selectedRange?.to}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Separator className="bg-border/50" />

      {/* Class Filters */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Por Turma
        </h4>
        
        <ScrollArea className="h-24">
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={filters.classId === 'ALL' ? "default" : "outline"}
              size="sm"
              onClick={() => handleClassFilter('ALL')}
              className={cn(
                "h-8 text-xs transition-all duration-200",
                filters.classId === 'ALL' ? "bg-primary/20 border-primary/40 shadow-sm" : "hover:bg-muted/50"
              )}
              role="tab"
              aria-selected={filters.classId === 'ALL'}
              tabIndex={0}
            >
              Todas
            </Button>
            
            {professorClasses.map(cls => (
              <Button
                key={cls.id}
                variant={filters.classId === cls.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleClassFilter(cls.id)}
                className={cn(
                  "h-8 text-xs transition-all duration-200",
                  filters.classId === cls.id ? "bg-primary/20 border-primary/40 shadow-sm" : "hover:bg-muted/50"
                )}
                role="tab"
                aria-selected={filters.classId === cls.id}
                tabIndex={0}
              >
                {cls.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <>
          <Separator className="bg-border/50" />
          <div className="text-xs text-muted-foreground">
            <strong>Mostrando:</strong> {feedMetrics.all} post{feedMetrics.all !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  );
}
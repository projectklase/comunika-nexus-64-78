import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Coffee, 
  Eye, 
  EyeOff,
  Users 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getProfessorClasses } from '@/utils/professor-helpers';
import { useStudentClasses } from '@/hooks/useStudentClasses';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { useSelectState, DEFAULT_SELECT_TOKENS } from '@/hooks/useSelectState';
import { useEffect, useMemo } from 'react';

interface CalendarFiltersProps {
  activeFilters: {
    events: boolean;
    deadlines: boolean;
  };
  showHolidays: boolean;
  selectedClassId?: string;
  onFilterChange: (filters: { events: boolean; deadlines: boolean }) => void;
  onHolidaysToggle: (show: boolean) => void;
  onClassChange?: (classId: string) => void;
  eventCount: number;
  deadlineCount: number;
}

export function CalendarFilters({
  activeFilters,
  showHolidays,
  selectedClassId,
  onFilterChange,
  onHolidaysToggle,
  onClassChange,
  eventCount,
  deadlineCount
}: CalendarFiltersProps) {
  const { user } = useAuth();
  const { loadClasses } = useClassStore();
  const { loadPeople } = usePeopleStore();
  const { classes: studentClasses } = useStudentClasses();
  
  // Load data
  useEffect(() => {
    loadClasses();
    loadPeople();
  }, [loadClasses, loadPeople]);
  
  // Get classes based on user role
  const userClasses = useMemo(() => {
    if (user?.role === 'professor') {
      return getProfessorClasses(user.id);
    } else if (user?.role === 'aluno') {
      return studentClasses;
    }
    return [];
  }, [user, studentClasses]);
  
  const hasClasses = userClasses.length > 0;
  
  const toggleFilter = (type: 'events' | 'deadlines') => {
    onFilterChange({
      ...activeFilters,
      [type]: !activeFilters[type]
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 glass-card rounded-lg">
      <div className="text-sm font-medium text-muted-foreground">
        Filtros:
      </div>

      {/* Events Filter */}
      <Button
        variant={activeFilters.events ? "secondary" : "outline"}
        size="sm"
        onClick={() => toggleFilter('events')}
        className={cn(
          "h-8 gap-2 transition-all duration-200",
          activeFilters.events 
            ? "bg-amber-500/20 text-amber-400 border-amber-500/30 neon-glow" 
            : "text-muted-foreground hover:text-amber-400"
        )}
      >
        <CalendarIcon className="h-3 w-3" />
        Eventos
        <Badge variant="outline" className="text-xs">
          {eventCount}
        </Badge>
      </Button>

      {/* Deadlines Filter */}
      <Button
        variant={activeFilters.deadlines ? "secondary" : "outline"}
        size="sm"
        onClick={() => toggleFilter('deadlines')}
        className={cn(
          "h-8 gap-2 transition-all duration-200",
          activeFilters.deadlines 
            ? "bg-amber-500/20 text-amber-400 border-amber-500/30 neon-glow" 
            : "text-muted-foreground hover:text-amber-400"
        )}
      >
        <Clock className="h-3 w-3" />
        Atividades
        <Badge variant="outline" className="text-xs">
          {deadlineCount}
        </Badge>
      </Button>

      {/* Holidays Toggle */}
      <Button
        variant={showHolidays ? "secondary" : "outline"}
        size="sm"
        onClick={() => onHolidaysToggle(!showHolidays)}
        className={cn(
          "h-8 gap-2 transition-all duration-200",
          showHolidays 
            ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
            : "text-muted-foreground hover:text-amber-400"
        )}
      >
        <Coffee className="h-3 w-3" />
        Feriados
        {showHolidays ? (
          <Eye className="h-3 w-3" />
        ) : (
          <EyeOff className="h-3 w-3" />
        )}
      </Button>

      {/* Class Filter for Professor and Student */}
      {(user?.role === 'professor' || user?.role === 'aluno') && onClassChange && (
        <Select
          value={selectedClassId || DEFAULT_SELECT_TOKENS.ALL_CLASSES}
          onValueChange={onClassChange}
          disabled={!hasClasses}
        >
          <SelectTrigger className={cn(
            "h-8 min-w-[140px] border-primary/30 glass",
            !hasClasses && "opacity-50 cursor-not-allowed"
          )}>
            <Users className="h-3 w-3 mr-2" />
            <SelectValue placeholder={hasClasses ? "Turma" : "Nenhuma turma atribuída"} />
          </SelectTrigger>
          <SelectContent className="glass border border-border/30 backdrop-blur-xl bg-background/95">
            <SelectItem value={DEFAULT_SELECT_TOKENS.ALL_CLASSES} className="hover:bg-accent/20">
              Todas as turmas
            </SelectItem>
            {userClasses.map(cls => (
              <SelectItem key={cls.id} value={cls.id} className="hover:bg-accent/20">
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Info for Secretaria */}
      {user?.role === 'secretaria' && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-accent/10 border border-accent/30">
          <Users className="h-3 w-3 text-accent" />
          <span className="text-xs text-accent">Todas as turmas</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 ml-auto">
        <div className="text-xs text-muted-foreground">Legenda:</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500/40" />
            <span className="text-xs text-muted-foreground">Eventos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500/40" />
            <span className="text-xs text-muted-foreground">Atividades</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/40" />
            <span className="text-xs text-muted-foreground">Avisos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
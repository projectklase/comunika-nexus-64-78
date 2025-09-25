import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Filter, 
  Calendar, 
  CalendarDays, 
  FileText, 
  MessageSquare, 
  Bookmark,
  RotateCcw,
  Zap,
  Clock,
  Star
} from 'lucide-react';
import { PostType } from '@/types/post';
import { cn } from '@/lib/utils';

export interface QuickFiltersState {
  selectedTypes: PostType[];
  timeFilter: 'all' | 'today' | 'week';
  showOnlySaved: boolean;
}

interface QuickFiltersProps {
  filters: QuickFiltersState;
  onFiltersChange: (filters: QuickFiltersState) => void;
  onReset: () => void;
  className?: string;
}

const POST_TYPE_CONFIG = {
  ATIVIDADE: { label: 'Atividades', icon: '📝', shortLabel: 'ATI', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  TRABALHO: { label: 'Trabalhos', icon: '📚', shortLabel: 'TRA', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  PROVA: { label: 'Provas', icon: '📄', shortLabel: 'PRO', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  EVENTO: { label: 'Eventos', icon: '📅', shortLabel: 'EVE', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  AVISO: { label: 'Avisos', icon: '📢', shortLabel: 'AVI', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  COMUNICADO: { label: 'Comunicados', icon: '📋', shortLabel: 'COM', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
} as const;

const TIME_FILTERS = [
  { value: 'all', label: 'Todos', icon: Zap, shortLabel: 'ALL' },
  { value: 'today', label: 'Hoje', icon: Clock, shortLabel: 'HOJ' },
  { value: 'week', label: 'Semana', icon: CalendarDays, shortLabel: 'SEM' },
] as const;

export function QuickFilters({ filters, onFiltersChange, onReset, className }: QuickFiltersProps) {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth < 1024);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleType = (type: PostType) => {
    const newTypes = filters.selectedTypes.includes(type)
      ? filters.selectedTypes.filter(t => t !== type)
      : [...filters.selectedTypes, type];
    
    onFiltersChange({ ...filters, selectedTypes: newTypes });
  };

  const setTimeFilter = (timeFilter: QuickFiltersState['timeFilter']) => {
    onFiltersChange({ ...filters, timeFilter });
  };

  const toggleSaved = () => {
    onFiltersChange({ ...filters, showOnlySaved: !filters.showOnlySaved });
  };

  const hasActiveFilters = () => {
    return filters.selectedTypes.length > 0 || 
           filters.timeFilter !== 'all' || 
           filters.showOnlySaved;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.selectedTypes.length > 0) count++;
    if (filters.timeFilter !== 'all') count++;
    if (filters.showOnlySaved) count++;
    return count;
  };

  return (
    <Card className={cn("glass-card border-border/50 overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header - Cyber Style */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="h-4 w-4 text-primary animate-glow-pulse" />
                {hasActiveFilters() && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-sm font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                FILTROS RÁPIDOS
              </span>
              {hasActiveFilters() && (
                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
                  {getActiveFiltersCount()} ativo{getActiveFiltersCount() > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Types - Compact Chips */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground/80 tracking-wider uppercase">
              Por Tipo:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(POST_TYPE_CONFIG).map(([type, config]) => {
                const isSelected = filters.selectedTypes.includes(type as PostType);
                
                return (
                    <Button
                      key={type}
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleType(type as PostType)}
                      className={cn(
                        "h-8 px-3 text-xs font-medium transition-all duration-200 hover:scale-105",
                        "border border-transparent rounded-lg relative overflow-hidden min-w-fit",
                        isSelected 
                          ? `${config.color} shadow-lg shadow-current/20 scale-105`
                          : "hover:bg-muted/50 hover:border-border text-muted-foreground"
                      )}
                    >
                      <span className="mr-1.5 text-xs">{config.icon}</span>
                      <span className="hidden sm:inline whitespace-nowrap">{isCompact ? config.shortLabel : config.label}</span>
                      <span className="sm:hidden whitespace-nowrap">{config.shortLabel}</span>
                      {isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                      )}
                    </Button>
                );
              })}
            </div>
          </div>

          {/* Time Filters - Sleek Toggle */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground/80 tracking-wider uppercase">
              Período:
            </span>
            <div className="grid grid-cols-3 gap-2 p-2 glass-card rounded-xl border border-border/30">
              {TIME_FILTERS.map(({ value, label, icon: Icon, shortLabel }) => {
                const isSelected = filters.timeFilter === value;
                
                return (
                  <Button
                    key={value}
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimeFilter(value as QuickFiltersState['timeFilter'])}
                    className={cn(
                      "h-12 text-xs font-medium transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center gap-1 min-w-0",
                      isSelected 
                        ? "bg-gradient-primary text-primary-foreground shadow-glow border border-primary/50" 
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground glass-hover"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden md:inline text-[10px] leading-tight truncate w-full text-center">{label}</span>
                    <span className="md:hidden text-[10px] leading-tight truncate w-full text-center">{shortLabel}</span>
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse rounded" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Saved Filter - Special Button */}
          <div className="pt-2 border-t border-border/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSaved}
              className={cn(
                "w-full h-9 text-xs font-medium transition-all duration-300 relative overflow-hidden",
                "border border-transparent rounded-lg group",
                filters.showOnlySaved 
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/20" 
                  : "hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2 justify-center min-w-0">
                <Star className={cn(
                  "h-3 w-3 flex-shrink-0 transition-all duration-300",
                  filters.showOnlySaved ? "text-amber-400 animate-pulse" : ""
                )} />
                <span className="whitespace-nowrap text-center">
                  {filters.showOnlySaved ? 'Mostrando Salvos' : 'Mostrar Salvos'}
                </span>
                {filters.showOnlySaved && (
                  <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30 flex-shrink-0">
                    ON
                  </Badge>
                )}
              </div>
              {filters.showOnlySaved && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-pulse" />
              )}
            </Button>
          </div>

          {/* Stats */}
          {hasActiveFilters() && (
            <div className="text-center pt-2 border-t border-border/30">
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">{getActiveFiltersCount()}</span> filtro{getActiveFiltersCount() > 1 ? 's' : ''} ativo{getActiveFiltersCount() > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
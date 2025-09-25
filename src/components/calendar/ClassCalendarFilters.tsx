import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FileText, FolderOpen, ClipboardCheck, Clock, AlertTriangle } from 'lucide-react';
import { ActivityType } from '@/types/post';
import { ClassCalendarMetrics } from '@/hooks/useClassCalendarData';

interface ClassCalendarFiltersProps {
  activeFilters: {
    types: ActivityType[];
    statuses: string[];
  };
  showScheduled: boolean;
  onFilterChange: (filters: { types: ActivityType[]; statuses: string[] }) => void;
  onScheduledToggle: (show: boolean) => void;
  metrics: ClassCalendarMetrics;
  userRole: string;
}

const TYPE_CONFIG = {
  ATIVIDADE: {
    label: 'Atividade',
    icon: FileText,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  TRABALHO: {
    label: 'Trabalho', 
    icon: FolderOpen,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  },
  PROVA: {
    label: 'Prova',
    icon: ClipboardCheck,
    color: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
} as const;

export function ClassCalendarFilters({
  activeFilters,
  showScheduled,
  onFilterChange,
  onScheduledToggle,
  metrics,
  userRole
}: ClassCalendarFiltersProps) {
  const toggleTypeFilter = (type: ActivityType) => {
    const newTypes = activeFilters.types.includes(type)
      ? activeFilters.types.filter(t => t !== type)
      : [...activeFilters.types, type];
    
    onFilterChange({ ...activeFilters, types: newTypes });
  };

  const clearAllFilters = () => {
    onFilterChange({ types: [], statuses: [] });
  };

  const hasActiveFilters = activeFilters.types.length > 0 || activeFilters.statuses.length > 0;

  return (
    <div className="glass-card rounded-lg p-4 space-y-4">
      {/* Type Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Filtrar por Tipo</h3>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="h-7 px-2 text-xs"
            >
              Limpar filtros
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_CONFIG) as ActivityType[]).map(type => {
            const config = TYPE_CONFIG[type];
            const isActive = activeFilters.types.includes(type);
            const count = metrics[type.toLowerCase() as keyof ClassCalendarMetrics];
            const Icon = config.icon;
            
            return (
              <Button
                key={type}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => toggleTypeFilter(type)}
                className={`h-8 ${isActive ? 'bg-primary/20 border-primary/40' : 'hover:bg-muted/50'}`}
              >
                <Icon className="h-3 w-3 mr-1.5" />
                {config.label}
                <Badge 
                  variant="secondary" 
                  className="ml-2 h-5 px-1.5 text-xs bg-background/50"
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      <Separator className="bg-border/50" />

      {/* Status Indicators */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Total: {metrics.total}</span>
        </div>
        
        {metrics.overdue > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-pink-400" />
            <span className="text-pink-400">Atrasadas: {metrics.overdue}</span>
          </div>
        )}
        
        {userRole === 'professor' && metrics.scheduled > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-yellow-400" />
            <span className="text-yellow-400">Agendadas: {metrics.scheduled}</span>
          </div>
        )}
      </div>

      {/* Professor Controls */}
      {userRole === 'professor' && (
        <>
          <Separator className="bg-border/50" />
          <div className="flex items-center justify-between">
            <Label htmlFor="show-scheduled" className="text-sm font-medium">
              Mostrar atividades agendadas
            </Label>
            <Switch
              id="show-scheduled"
              checked={showScheduled}
              onCheckedChange={onScheduledToggle}
            />
          </div>
        </>
      )}
    </div>
  );
}
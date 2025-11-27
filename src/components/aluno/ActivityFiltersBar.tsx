import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, HourglassIcon, CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeliveryStatus } from '@/types/delivery';
import { ActivityType } from '@/types/post';

interface ActivityFiltersBarProps {
  selectedStatus: DeliveryStatus | 'ALL';
  selectedType: ActivityType | 'ALL';
  onStatusChange: (status: DeliveryStatus | 'ALL') => void;
  onTypeChange: (type: ActivityType | 'ALL') => void;
  counters: {
    naoEntregue: number;
    aguardando: number;
    aprovada: number;
    devolvida: number;
    atividade: number;
    trabalho: number;
    prova: number;
  };
}

export function ActivityFiltersBar({
  selectedStatus,
  selectedType,
  onStatusChange,
  onTypeChange,
  counters
}: ActivityFiltersBarProps) {
  const hasActiveFilters = selectedStatus !== 'ALL' || selectedType !== 'ALL';

  const statusFilters = [
    {
      id: 'NAO_ENTREGUE' as DeliveryStatus,
      label: 'Pendentes',
      icon: Clock,
      color: 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10',
      activeColor: 'bg-yellow-500/20 border-yellow-500',
      count: counters.naoEntregue
    },
    {
      id: 'AGUARDANDO' as DeliveryStatus,
      label: 'Em Análise',
      icon: HourglassIcon,
      color: 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10',
      activeColor: 'bg-blue-500/20 border-blue-500',
      count: counters.aguardando
    },
    {
      id: 'APROVADA' as DeliveryStatus,
      label: 'Aprovadas',
      icon: CheckCircle,
      color: 'border-green-500/50 text-green-400 hover:bg-green-500/10',
      activeColor: 'bg-green-500/20 border-green-500',
      count: counters.aprovada
    },
    {
      id: 'DEVOLVIDA' as DeliveryStatus,
      label: 'Devolvidas',
      icon: XCircle,
      color: 'border-red-500/50 text-red-400 hover:bg-red-500/10',
      activeColor: 'bg-red-500/20 border-red-500',
      count: counters.devolvida
    }
  ];

  const typeFilters = [
    {
      id: 'ATIVIDADE' as ActivityType,
      label: 'Atividade',
      emoji: '📝',
      color: 'border-green-500/50 text-green-400 hover:bg-green-500/10',
      activeColor: 'bg-green-500/20 border-green-500',
      count: counters.atividade
    },
    {
      id: 'TRABALHO' as ActivityType,
      label: 'Trabalho',
      emoji: '📚',
      color: 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10',
      activeColor: 'bg-yellow-500/20 border-yellow-500',
      count: counters.trabalho
    },
    {
      id: 'PROVA' as ActivityType,
      label: 'Prova',
      emoji: '📄',
      color: 'border-red-500/50 text-red-400 hover:bg-red-500/10',
      activeColor: 'bg-red-500/20 border-red-500',
      count: counters.prova
    }
  ];

  const clearFilters = () => {
    onStatusChange('ALL');
    onTypeChange('ALL');
  };

  return (
    <div className="space-y-4">
      {/* Status Filters */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Por Status:</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {statusFilters.map((filter) => {
            const Icon = filter.icon;
            const isActive = selectedStatus === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => onStatusChange(isActive ? 'ALL' : filter.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 whitespace-nowrap glass-card',
                  isActive ? filter.activeColor : filter.color
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{filter.label}</span>
                {filter.count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {filter.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Type Filters */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Por Tipo:</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {typeFilters.map((filter) => {
            const isActive = selectedType === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => onTypeChange(isActive ? 'ALL' : filter.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 whitespace-nowrap glass-card',
                  isActive ? filter.activeColor : filter.color
                )}
              >
                <span>{filter.emoji}</span>
                <span className="text-sm font-medium">{filter.label}</span>
                {filter.count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {filter.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

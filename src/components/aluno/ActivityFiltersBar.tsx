import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, HourglassIcon, CheckCircle, XCircle, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeliveryStatus } from '@/types/delivery';
import { ActivityType } from '@/types/post';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const hasActiveFilters = selectedStatus !== 'ALL' || selectedType !== 'ALL';

  // Contar quantos filtros estão ativos
  const activeFiltersCount = (selectedStatus !== 'ALL' ? 1 : 0) + (selectedType !== 'ALL' ? 1 : 0);

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
    setIsSheetOpen(false);
  };

  // Componente de conteúdo dos filtros (reutilizado no desktop e no Sheet)
  const FiltersContent = ({ inSheet = false }: { inSheet?: boolean }) => (
    <div className={cn("space-y-4", inSheet && "px-1")}>
      {/* Status Filters */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Por Status:</h3>
        <div className={cn(
          inSheet ? "grid grid-cols-2 gap-2" : "flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
        )}>
          {statusFilters.map((filter) => {
            const Icon = filter.icon;
            const isActive = selectedStatus === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => {
                  onStatusChange(isActive ? 'ALL' : filter.id);
                  if (inSheet && !isActive) setIsSheetOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 glass-card',
                  inSheet ? 'justify-center' : 'whitespace-nowrap',
                  isActive ? filter.activeColor : filter.color
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
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
        <div className={cn(
          inSheet ? "grid grid-cols-2 gap-2" : "flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
        )}>
          {typeFilters.map((filter) => {
            const isActive = selectedType === filter.id;
            
            return (
              <button
                key={filter.id}
                onClick={() => {
                  onTypeChange(isActive ? 'ALL' : filter.id);
                  if (inSheet && !isActive) setIsSheetOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 glass-card',
                  inSheet ? 'justify-center' : 'whitespace-nowrap',
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
          className="text-muted-foreground hover:text-foreground w-full sm:w-auto"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );

  // Mobile: Botão que abre Sheet
  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between glass-card border-border/50"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[80vh]">
          <SheetHeader className="pb-4">
            <SheetTitle>Filtrar Atividades</SheetTitle>
          </SheetHeader>
          <FiltersContent inSheet />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Filtros inline
  return <FiltersContent />;
}

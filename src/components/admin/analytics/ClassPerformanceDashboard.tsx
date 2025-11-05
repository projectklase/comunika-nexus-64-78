import { useState, useMemo } from 'react';
import { useClasses } from '@/hooks/useClasses';
import { useClassPerformance } from '@/hooks/useClassPerformance';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, AlertTriangle, TrendingUp } from 'lucide-react';
import { MetricKPI } from './MetricKPI';
import { ClassPerformanceCard } from './ClassPerformanceCard';
import { ClassPerformanceAnalytics } from '@/types/class-performance';

interface ClassPerformanceDashboardProps {
  daysFilter: number;
}

type SortOption = 'delivery_rate_desc' | 'delivery_rate_asc' | 'total_students' | 'avg_days_to_deliver';

export function ClassPerformanceDashboard({ daysFilter }: ClassPerformanceDashboardProps) {
  const [sortBy, setSortBy] = useState<SortOption>('delivery_rate_desc');
  const { classes, loading: isLoadingClasses } = useClasses();
  
  const activeClasses = useMemo(
    () => classes?.filter(c => c.status === 'ATIVA') || [],
    [classes]
  );

  // Buscar performance de todas as turmas
  const classesWithPerformance = activeClasses.map(cls => {
    const { data: perf } = useClassPerformance(cls.id, daysFilter);
    return perf;
  }).filter(Boolean) as ClassPerformanceAnalytics[];

  // Ordenar turmas
  const sortedClasses = useMemo(() => {
    const sorted = [...classesWithPerformance];
    switch (sortBy) {
      case 'delivery_rate_desc':
        return sorted.sort((a, b) => b.delivery_rate - a.delivery_rate);
      case 'delivery_rate_asc':
        return sorted.sort((a, b) => a.delivery_rate - b.delivery_rate);
      case 'total_students':
        return sorted.sort((a, b) => b.total_students - a.total_students);
      case 'avg_days_to_deliver':
        return sorted.sort((a, b) => (a.avg_days_to_deliver || 999) - (b.avg_days_to_deliver || 999));
      default:
        return sorted;
    }
  }, [classesWithPerformance, sortBy]);

  // Calcular KPIs
  const topThreeClasses = useMemo(
    () => [...classesWithPerformance]
      .sort((a, b) => b.delivery_rate - a.delivery_rate)
      .slice(0, 3),
    [classesWithPerformance]
  );

  const lowPerformanceCount = useMemo(
    () => classesWithPerformance.filter(c => c.delivery_rate < 60).length,
    [classesWithPerformance]
  );

  const averageDeliveryRate = useMemo(() => {
    if (classesWithPerformance.length === 0) return 0;
    const sum = classesWithPerformance.reduce((acc, c) => acc + c.delivery_rate, 0);
    return sum / classesWithPerformance.length;
  }, [classesWithPerformance]);

  const isLoading = isLoadingClasses || classesWithPerformance.length === 0;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold font-mono gradient-text">
          📊 Performance por Turma - Visão Executiva
        </DialogTitle>
        <DialogDescription className="text-slate-400 font-mono">
          Análise comparativa de desempenho das turmas ativas
        </DialogDescription>
      </DialogHeader>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-[250px] bg-slate-900/50 border-slate-700">
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delivery_rate_desc">Taxa de Entrega (Maior → Menor)</SelectItem>
            <SelectItem value="delivery_rate_asc">Taxa de Entrega (Menor → Maior)</SelectItem>
            <SelectItem value="total_students">Número de Alunos</SelectItem>
            <SelectItem value="avg_days_to_deliver">Tempo Médio de Entrega</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs do Topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <MetricKPI
              title="Top 3 Turmas"
              value={topThreeClasses.length > 0 ? topThreeClasses[0].class_name : 'N/A'}
              icon={Trophy}
              colorScheme="amber"
              description={topThreeClasses.length > 0 
                ? `${topThreeClasses[0].delivery_rate.toFixed(0)}% de taxa de entrega` 
                : 'Sem dados'}
            />
            
            <MetricKPI
              title="Baixo Desempenho"
              value={lowPerformanceCount}
              icon={AlertTriangle}
              colorScheme={lowPerformanceCount > 3 ? 'red' : 'amber'}
              description={`${lowPerformanceCount} turmas com taxa <60%`}
            />
            
            <MetricKPI
              title="Média Geral"
              value={`${averageDeliveryRate.toFixed(0)}%`}
              icon={TrendingUp}
              colorScheme={
                averageDeliveryRate > 80 ? 'green' :
                averageDeliveryRate > 60 ? 'cyan' :
                averageDeliveryRate > 40 ? 'amber' : 'red'
              }
              description="Taxa média de todas as turmas"
            />
          </>
        )}
      </div>

      {/* Lista de Turmas */}
      <div className="space-y-4">
        <h3 className="text-sm font-mono uppercase text-slate-400 tracking-wider">
          Todas as Turmas ({sortedClasses.length})
        </h3>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : sortedClasses.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-mono">
            Nenhuma turma ativa encontrada
          </div>
        ) : (
          <div className="space-y-4">
            {sortedClasses.map((performance) => (
              <ClassPerformanceCard
                key={performance.class_id}
                performance={performance}
                daysFilter={daysFilter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

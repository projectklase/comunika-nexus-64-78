import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClasses } from '@/hooks/useClasses';
import { useAllClassesPerformance } from '@/hooks/useAllClassesPerformance';
import { MetricCard } from './MetricCard';
import { TrendingUp, Clock, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ClassPerformanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysFilter: number;
}

export function ClassPerformanceModal({ open, onOpenChange, daysFilter }: ClassPerformanceModalProps) {
  const { classes, loading: isLoadingClasses } = useClasses();
  const activeClasses = useMemo(() => classes?.filter(c => c.status === 'ATIVA') || [], [classes]);
  
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [compareMode, setCompareMode] = useState(false);

  // Buscar IDs das turmas ativas
  const classIds = useMemo(() => activeClasses.map(c => c.id), [activeClasses]);
  
  // Buscar performance de todas as turmas de uma vez
  const { data: performanceData = [], isLoading: isLoadingPerformance } = useAllClassesPerformance(
    classIds,
    daysFilter
  );

  // Combinar classes com seus dados de performance
  const classesWithPerformance = useMemo(() => {
    return activeClasses.map(cls => {
      const performance = performanceData.find(p => p.class_id === cls.id);
      return { ...cls, performance };
    });
  }, [activeClasses, performanceData]);

  const isLoading = isLoadingClasses || isLoadingPerformance;

  // Calcular médias gerais
  const overallMetrics = useMemo(() => {
    const validPerformances = classesWithPerformance
      .filter(c => c.performance)
      .map(c => c.performance!);

    if (validPerformances.length === 0) {
      return {
        avgDeliveryRate: 0,
        avgTime: 0,
        avgApprovalRate: 0,
        totalPending: 0,
      };
    }

    return {
      avgDeliveryRate: Math.round(
        validPerformances.reduce((acc, p) => acc + p.delivery_rate, 0) / validPerformances.length
      ),
      avgTime: Math.round(
        validPerformances.reduce((acc, p) => acc + (p.avg_days_to_deliver || 0), 0) / validPerformances.length
      ),
      avgApprovalRate: Math.round(
        validPerformances.reduce((acc, p) => acc + ((p.approved_deliveries / p.total_deliveries) * 100 || 0), 0) / validPerformances.length
      ),
      totalPending: validPerformances.reduce((acc, p) => acc + p.pending_deliveries, 0),
    };
  }, [classesWithPerformance]);

  const getStatusBadge = (rate: number) => {
    if (rate >= 85) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">🟢 Excelente</Badge>;
    if (rate >= 60) return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">🟡 Atenção</Badge>;
    return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">🔴 Crítico</Badge>;
  };

  const getStatus = (rate: number): 'success' | 'warning' | 'critical' => {
    if (rate >= 85) return 'success';
    if (rate >= 60) return 'warning';
    return 'critical';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            📊 Performance por Turma - Visão Executiva
          </DialogTitle>
          <DialogDescription>
            Análise comparativa de engajamento e entregas nos últimos {daysFilter} dias
          </DialogDescription>
        </DialogHeader>

        {/* Controles */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Turmas</SelectItem>
                {activeClasses.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="compare-mode"
              checked={compareMode}
              onCheckedChange={setCompareMode}
            />
            <Label htmlFor="compare-mode" className="cursor-pointer">
              Modo Comparação
            </Label>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Taxa Média de Entrega"
                value={`${overallMetrics.avgDeliveryRate}%`}
                icon={TrendingUp}
                tooltip="Percentual de atividades entregues no prazo em relação ao total de atividades"
                status={getStatus(overallMetrics.avgDeliveryRate)}
              />
              <MetricCard
                title="Tempo Médio"
                value={`${overallMetrics.avgTime}d`}
                icon={Clock}
                tooltip="Tempo médio em dias entre a publicação da atividade e a entrega"
                status="neutral"
              />
              <MetricCard
                title="Taxa de Aprovação"
                value={`${overallMetrics.avgApprovalRate}%`}
                icon={CheckCircle}
                tooltip="Percentual de atividades aprovadas após avaliação"
                status={getStatus(overallMetrics.avgApprovalRate)}
              />
              <MetricCard
                title="Entregas Pendentes"
                value={overallMetrics.totalPending}
                icon={AlertCircle}
                tooltip="Total de atividades aguardando entrega em todas as turmas"
                status={overallMetrics.totalPending > 20 ? 'critical' : 'neutral'}
              />
            </div>

            {/* Tabela Comparativa de Turmas */}
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Desempenho Detalhado por Turma</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Turma</TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3" />
                            Alunos
                          </div>
                        </TableHead>
                        <TableHead className="text-center">Taxa Entrega</TableHead>
                        <TableHead className="text-center">Tempo Médio</TableHead>
                        <TableHead className="text-center">Aprovação</TableHead>
                        <TableHead className="text-center">Pendentes</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classesWithPerformance
                        .filter(cls => selectedClassId === 'all' || cls.id === selectedClassId)
                        .sort((a, b) => (b.performance?.delivery_rate || 0) - (a.performance?.delivery_rate || 0))
                        .map(cls => {
                          const approvalRate = cls.performance?.total_deliveries 
                            ? Math.round((cls.performance.approved_deliveries / cls.performance.total_deliveries) * 100)
                            : 0;
                          
                          return (
                            <TableRow key={cls.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell className="font-semibold">{cls.name}</TableCell>
                              <TableCell className="text-center">{cls.student_count || 0}</TableCell>
                              <TableCell className="text-center">
                                <span className="font-mono font-bold text-primary">
                                  {cls.performance?.delivery_rate || 0}%
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                {cls.performance?.avg_days_to_deliver || 0}d
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                {approvalRate}%
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={cls.performance?.pending_deliveries && cls.performance.pending_deliveries > 5 ? "destructive" : "secondary"}>
                                  {cls.performance?.pending_deliveries || 0}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {getStatusBadge(cls.performance?.delivery_rate || 0)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

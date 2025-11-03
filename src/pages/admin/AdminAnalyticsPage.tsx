import { useState } from 'react';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { useWeeklyHeatmap } from '@/hooks/useWeeklyHeatmap';
import { useRetentionMetrics } from '@/hooks/useRetentionMetrics';
import { useOperationalMetrics } from '@/hooks/useOperationalMetrics';
import { usePulseScore } from '@/hooks/usePulseScore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingUp, Users, AlertCircle, BookOpen, Activity, Building, Zap, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ActivityTrendChart } from '@/components/admin/ActivityTrendChart';
import { ClassPerformanceSection } from '@/components/admin/ClassPerformanceSection';
import { PostReadAnalytics } from '@/components/admin/PostReadAnalytics';
import { PredictiveInsightsDashboard } from '@/components/admin/PredictiveInsightsDashboard';
import { HeatmapModal } from '@/components/admin/analytics/HeatmapModal';
import { RetentionModal } from '@/components/admin/analytics/RetentionModal';
import { OperationalModal } from '@/components/admin/analytics/OperationalModal';
import { PulseScoreModal } from '@/components/admin/analytics/PulseScoreModal';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function AdminAnalyticsPage() {
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [openModal, setOpenModal] = useState<'heatmap' | 'retention' | 'operational' | 'pulse' | 'students-at-risk' | 'activity-trend' | 'class-performance' | 'post-engagement' | null>(null);
  const { data: analytics, isLoading, error } = useAdminAnalytics(daysFilter);
  const { data: heatmapData, isLoading: loadingHeatmap } = useWeeklyHeatmap(daysFilter);
  const { data: retentionData, isLoading: loadingRetention } = useRetentionMetrics(daysFilter);
  const { data: operationalData, isLoading: loadingOperational } = useOperationalMetrics();
  const { data: pulseData, isLoading: loadingPulse } = usePulseScore(daysFilter);

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar analytics: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-bold gradient-text">Centro de Inteligência</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Monitoramento avançado de engajamento e risco de evasão
          </p>
        </div>
        
        <Select
          value={daysFilter.toString()}
          onValueChange={(value) => setDaysFilter(parseInt(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Grid - Novos Cards Estratégicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Card 1: Mapa de Calor Semanal */}
        <button
          onClick={() => setOpenModal('heatmap')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-purple-500/20 to-blue-500/20
                     border-2 border-purple-500/30 hover:border-purple-500/60
                     shadow-lg hover:shadow-2xl hover:shadow-purple-500/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          {/* Efeito de partículas */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl animate-ping" />
          </div>

          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2 p-6">
            <Activity className="h-10 w-10 text-purple-500 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
                <div className="text-center">
                  <h3 className="font-bold text-lg mb-1">Mapa de Calor Semanal</h3>
                  <p className="text-xs text-muted-foreground">
                    Padrões de uso e horários de pico
                  </p>
                </div>
            {loadingHeatmap ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : (
              <div className="text-2xl font-bold text-purple-500 mt-2">
                {heatmapData?.peak_hour || '--'}
              </div>
            )}
          </div>
        </button>

        {/* Card 2: Retenção e Progressão */}
        <button
          onClick={() => setOpenModal('retention')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-green-500/20 to-emerald-500/20
                     border-2 border-green-500/30 hover:border-green-500/60
                     shadow-lg hover:shadow-2xl hover:shadow-green-500/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-green-500/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl animate-ping" />
          </div>

          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2 p-6">
            <TrendingUp className="h-10 w-10 text-green-500 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
                <div className="text-center">
                  <h3 className="font-bold text-lg mb-1">Retenção e Progressão</h3>
                  <p className="text-xs text-muted-foreground">
                    Ciclo de vida dos alunos
                  </p>
                </div>
            {loadingRetention ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : (
              <div className="text-3xl font-bold text-green-500 mt-2">
                {retentionData?.retention_rate.toFixed(0) || 0}%
              </div>
            )}
          </div>
        </button>

        {/* Card 3: Métricas Operacionais */}
        <button
          onClick={() => setOpenModal('operational')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-orange-500/20 to-amber-500/20
                     border-2 border-orange-500/30 hover:border-orange-500/60
                     shadow-lg hover:shadow-2xl hover:shadow-orange-500/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-orange-500/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl animate-ping" />
          </div>

          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2 p-6">
            <Building className="h-10 w-10 text-orange-500 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
                <div className="text-center">
                  <h3 className="font-bold text-lg mb-1">Métricas Operacionais</h3>
                  <p className="text-xs text-muted-foreground">
                    Eficiência e capacidade
                  </p>
                </div>
            {loadingOperational ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : (
              <div className="text-3xl font-bold text-orange-500 mt-2">
                {operationalData?.avg_occupancy || 0}%
              </div>
            )}
          </div>
        </button>

        {/* Card 4: Pulse Score™ */}
        <button
          onClick={() => setOpenModal('pulse')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20
                     border-2 border-purple-500/30 hover:border-purple-500/60
                     shadow-lg hover:shadow-2xl hover:shadow-purple-500/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 animate-pulse" />
          
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2 p-6">
            <Zap className="h-10 w-10 text-purple-500 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                <div className="text-center">
                  <h3 className="font-bold text-lg mb-1">Pulse Score™</h3>
                  <p className="text-xs text-muted-foreground">
                    Índice de saúde institucional
                  </p>
                </div>
            {loadingPulse ? (
              <Skeleton className="h-12 w-16 mt-2" />
            ) : (
              <div className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mt-2">
                {pulseData?.overall_score || 0}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Ações Rápidas - Glassmorphism Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 my-12">
        {/* Botão 1: Alunos em Risco */}
        <button
          onClick={() => setOpenModal('students-at-risk')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                     border-2 border-destructive/30 hover:border-destructive/60
                     shadow-lg hover:shadow-2xl hover:shadow-destructive/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          {/* Efeito de partículas */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-destructive/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-destructive/10 rounded-full blur-2xl animate-ping" />
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 p-6">
            <AlertTriangle className="h-12 w-12 text-destructive group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-xl mb-1">Alunos em Risco</h3>
              <p className="text-xs text-muted-foreground">Identificar prioridades</p>
            </div>
            <div className="text-4xl font-bold text-destructive">
              {isLoading ? '...' : analytics?.students_at_risk_count || 0}
            </div>
          </div>
        </button>

        {/* Botão 2: Tendência de Atividades */}
        <button
          onClick={() => setOpenModal('activity-trend')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                     border-2 border-primary/30 hover:border-primary/60
                     shadow-lg hover:shadow-2xl hover:shadow-primary/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          {/* Efeito de partículas */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-ping" />
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 p-6">
            <TrendingUp className="h-12 w-12 text-primary group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-xl mb-1">Tendência de Atividades</h3>
              <p className="text-xs text-muted-foreground">Evolução temporal</p>
            </div>
            <div className="text-4xl font-bold text-primary">
              {isLoading ? '...' : analytics?.activity_trend.reduce((sum, day) => sum + day.activities_published, 0) || 0}
            </div>
          </div>
        </button>

        {/* Botão 3: Performance por Turma */}
        <button
          onClick={() => setOpenModal('class-performance')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                     border-2 border-warning/30 hover:border-warning/60
                     shadow-lg hover:shadow-2xl hover:shadow-warning/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          {/* Efeito de partículas */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-warning/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-warning/10 rounded-full blur-2xl animate-ping" />
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 p-6">
            <Users className="h-12 w-12 text-warning group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-xl mb-1">Performance por Turma</h3>
              <p className="text-xs text-muted-foreground">Comparativo de classes</p>
            </div>
            <div className="text-2xl font-bold text-warning truncate max-w-full">
              {isLoading ? '...' : analytics?.worst_class_name || 'N/A'}
            </div>
          </div>
        </button>

        {/* Botão 4: Análise de Engajamento */}
        <button
          onClick={() => setOpenModal('post-engagement')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                     border-2 border-success/30 hover:border-success/60
                     shadow-lg hover:shadow-2xl hover:shadow-success/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          {/* Efeito de partículas */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-success/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-success/10 rounded-full blur-2xl animate-ping" />
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 p-6">
            <BookOpen className="h-12 w-12 text-success group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-xl mb-1">Análise de Engajamento</h3>
              <p className="text-xs text-muted-foreground">Leituras e interações</p>
            </div>
            <div className="text-4xl font-bold text-success">
              {isLoading ? '...' : analytics?.activity_trend.reduce((sum, day) => sum + day.deliveries_made, 0) || 0}
            </div>
          </div>
        </button>
      </div>

      {/* Dashboard de IA */}
      <Separator className="my-12" />
      <section className="mb-12">
        <PredictiveInsightsDashboard />
      </section>

      {/* Modal 1: Alunos em Risco */}
      <Dialog open={openModal === 'students-at-risk'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto backdrop-blur-xl bg-background/95 border border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Alunos em Risco de Evasão
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    <p className="text-xs">
                      Lista dos 10 alunos com maior risco de evasão baseado em: dias sem login, entregas pendentes e atividades aguardando avaliação. Priorize contato com alunos que não fazem login há mais de 14 dias.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
            <DialogDescription>
              Top 10 alunos que necessitam atenção imediata
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : analytics?.students_at_risk_list.length === 0 ? (
              <Alert>
                <AlertDescription>
                  ✅ Ótimas notícias! Nenhum aluno identificado em risco de evasão no momento.
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-right">Dias sem Login</TableHead>
                    <TableHead className="text-right">Entregas Pendentes</TableHead>
                    <TableHead className="text-right">Aguardando Avaliação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.students_at_risk_list.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium">{student.student_name}</TableCell>
                      <TableCell>{student.class_name || 'Sem turma'}</TableCell>
                      <TableCell className="text-right">
                        {student.days_since_last_login !== null ? (
                          <span className={student.days_since_last_login > 14 ? 'text-destructive font-bold' : ''}>
                            {student.days_since_last_login}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={student.pending_deliveries > 3 ? 'text-warning font-bold' : ''}>
                          {student.pending_deliveries}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {student.pending_evaluations}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Tendência de Atividades */}
      <Dialog open={openModal === 'activity-trend'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-6xl max-h-[85vh] backdrop-blur-xl bg-background/95 border border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <TrendingUp className="h-6 w-6 text-primary" />
              Tendência de Atividades
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    <p className="text-xs">
                      Visualize a relação entre atividades publicadas e entregas realizadas ao longo do tempo. Identifique períodos de baixo engajamento ou sobrecarga de atividades.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
            <DialogDescription>
              Comparação entre atividades publicadas e entregas realizadas ao longo do tempo
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : analytics?.activity_trend && analytics.activity_trend.length > 0 ? (
              <div className="h-96 w-full">
                <ActivityTrendChart data={analytics.activity_trend} />
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  Nenhum dado disponível para o período selecionado.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Drawer 3: Performance por Turma */}
      <Sheet open={openModal === 'class-performance'} onOpenChange={() => setOpenModal(null)}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto backdrop-blur-xl bg-background/95 border-l border-white/10">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6 text-warning" />
              Performance por Turma
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    <p className="text-xs">
                      Análise completa de métricas por turma: taxa de entrega, tempo médio, aprovações e devoluções. Selecione uma turma para ver detalhes e identificar necessidades de suporte.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </SheetTitle>
            <SheetDescription>
              Análise detalhada de desempenho de cada turma
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            <ClassPerformanceSection daysFilter={daysFilter} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Drawer 4: Análise de Engajamento */}
      <Sheet open={openModal === 'post-engagement'} onOpenChange={() => setOpenModal(null)}>
        <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto backdrop-blur-xl bg-background/95 border-l border-white/10">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <BookOpen className="h-6 w-6 text-success" />
              Análise de Engajamento
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    <p className="text-xs">
                      Métricas detalhadas sobre leitura de posts: quais posts têm mais engajamento, quais tipos geram mais interesse, e quais alunos são mais engajados. Use para otimizar comunicação.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </SheetTitle>
            <SheetDescription>
              Métricas detalhadas de leituras e engajamento dos alunos com posts
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            <PostReadAnalytics daysFilter={daysFilter} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Novos Modais Estratégicos */}
      <HeatmapModal 
        isOpen={openModal === 'heatmap'} 
        onClose={() => setOpenModal(null)}
        data={heatmapData}
      />

      <RetentionModal 
        isOpen={openModal === 'retention'} 
        onClose={() => setOpenModal(null)}
        data={retentionData}
      />

      <OperationalModal 
        isOpen={openModal === 'operational'} 
        onClose={() => setOpenModal(null)}
        data={operationalData}
      />

      <PulseScoreModal 
        isOpen={openModal === 'pulse'} 
        onClose={() => setOpenModal(null)}
        data={pulseData}
      />
    </div>
  );
}

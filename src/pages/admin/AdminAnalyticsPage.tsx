import { useState } from 'react';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingUp, Users, AlertCircle, BookOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ActivityTrendChart } from '@/components/admin/ActivityTrendChart';
import { ClassPerformanceSection } from '@/components/admin/ClassPerformanceSection';
import { PostReadAnalytics } from '@/components/admin/PostReadAnalytics';
import { PredictiveInsightsDashboard } from '@/components/admin/PredictiveInsightsDashboard';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function AdminAnalyticsPage() {
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [openModal, setOpenModal] = useState<'students-at-risk' | 'activity-trend' | 'class-performance' | 'post-engagement' | null>(null);
  const { data: analytics, isLoading, error } = useAdminAnalytics(daysFilter);

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

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* KPI 1: Alunos em Risco */}
        <div className="group relative h-40 rounded-2xl overflow-hidden
                        backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                        border-2 border-destructive/30 hover:border-destructive/60
                        shadow-lg hover:shadow-2xl hover:shadow-destructive/20
                        transition-all duration-500 hover:scale-102 hover:-translate-y-2
                        cursor-default">
          
          {/* Efeito de partículas */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-destructive/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-destructive/10 rounded-full blur-2xl animate-ping" />
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2 p-6">
            <AlertTriangle className="h-10 w-10 text-destructive group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-lg mb-1">Alunos em Risco</h3>
              <p className="text-xs text-muted-foreground">
                Sem login há 7+ dias ou com entregas pendentes
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : (
              <div className="text-3xl font-bold text-destructive mt-2">
                {analytics?.students_at_risk_count || 0}
              </div>
            )}
          </div>
        </div>

        {/* KPI 2: Pior Turma */}
        <div className="group relative h-40 rounded-2xl overflow-hidden
                        backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                        border-2 border-warning/30 hover:border-warning/60
                        shadow-lg hover:shadow-2xl hover:shadow-warning/20
                        transition-all duration-500 hover:scale-102 hover:-translate-y-2
                        cursor-default">
          
          {/* Efeito de partículas */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-warning/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-warning/10 rounded-full blur-2xl animate-ping" />
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2 p-6">
            <Users className="h-10 w-10 text-warning group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-lg mb-1">Turma de Atenção</h3>
              {isLoading ? (
                <Skeleton className="h-6 w-32 mx-auto" />
              ) : (
                <>
                  <p className="text-sm font-semibold text-warning truncate mb-1">
                    {analytics?.worst_class_name || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {analytics?.worst_class_pending_count || 0} entregas pendentes
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* KPI 3: Atividades Publicadas */}
        <div className="group relative h-40 rounded-2xl overflow-hidden
                        backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                        border-2 border-primary/30 hover:border-primary/60
                        shadow-lg hover:shadow-2xl hover:shadow-primary/20
                        transition-all duration-500 hover:scale-102 hover:-translate-y-2
                        cursor-default">
          
          {/* Efeito de partículas */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-ping" />
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2 p-6">
            <TrendingUp className="h-10 w-10 text-primary group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-lg mb-1">Atividades Publicadas</h3>
              <p className="text-xs text-muted-foreground">
                Nos últimos {daysFilter} dias
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : (
              <div className="text-3xl font-bold text-primary mt-2">
                {analytics?.activity_trend.reduce((sum, day) => sum + day.activities_published, 0) || 0}
              </div>
            )}
          </div>
        </div>

        {/* KPI 4: Entregas Realizadas */}
        <div className="group relative h-40 rounded-2xl overflow-hidden
                        backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                        border-2 border-success/30 hover:border-success/60
                        shadow-lg hover:shadow-2xl hover:shadow-success/20
                        transition-all duration-500 hover:scale-102 hover:-translate-y-2
                        cursor-default">
          
          {/* Efeito de partículas */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-success/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-success/10 rounded-full blur-2xl animate-ping" />
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2 p-6">
            <TrendingUp className="h-10 w-10 text-success group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-lg mb-1">Entregas Realizadas</h3>
              <p className="text-xs text-muted-foreground">
                Nos últimos {daysFilter} dias
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : (
              <div className="text-3xl font-bold text-success mt-2">
                {analytics?.activity_trend.reduce((sum, day) => sum + day.deliveries_made, 0) || 0}
              </div>
            )}
          </div>
        </div>
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
    </div>
  );
}

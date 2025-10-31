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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Alunos em Risco */}
        <Card className="glass border-destructive/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos em Risco</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {analytics?.students_at_risk_count || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Sem login há 7+ dias ou com entregas pendentes
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Pior Turma */}
        <Card className="glass border-warning/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turma de Atenção</CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-warning truncate">
                  {analytics?.worst_class_name || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.worst_class_pending_count || 0} entregas pendentes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 3: Atividades Publicadas */}
        <Card className="glass border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividades Publicadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {analytics?.activity_trend.reduce((sum, day) => sum + day.activities_published, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Nos últimos {daysFilter} dias
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 4: Entregas Realizadas */}
        <Card className="glass border-success/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Realizadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-success">
                  {analytics?.activity_trend.reduce((sum, day) => sum + day.deliveries_made, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Nos últimos {daysFilter} dias
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas - Glassmorphism Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Botão 1: Alunos em Risco */}
        <button
          onClick={() => setOpenModal('students-at-risk')}
          className="group relative h-[140px] rounded-xl overflow-hidden
                     backdrop-blur-xl bg-white/5 border border-white/10
                     hover:bg-white/10 hover:scale-105 hover:border-destructive/40
                     transition-all duration-300 ease-out
                     flex flex-col items-start justify-between p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 w-full">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div className="text-left">
                <h3 className="font-bold text-lg">Alunos em Risco</h3>
                <p className="text-xs text-muted-foreground">
                  Identificar prioridades
                </p>
              </div>
            </div>
            <div className="text-3xl font-bold text-destructive">
              {isLoading ? '...' : analytics?.students_at_risk_count || 0}
            </div>
          </div>
        </button>

        {/* Botão 2: Tendência de Atividades */}
        <button
          onClick={() => setOpenModal('activity-trend')}
          className="group relative h-[140px] rounded-xl overflow-hidden
                     backdrop-blur-xl bg-white/5 border border-white/10
                     hover:bg-white/10 hover:scale-105 hover:border-primary/40
                     transition-all duration-300 ease-out
                     flex flex-col items-start justify-between p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 w-full">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div className="text-left">
                <h3 className="font-bold text-lg">Tendência de Atividades</h3>
                <p className="text-xs text-muted-foreground">
                  Evolução temporal
                </p>
              </div>
            </div>
            <div className="text-3xl font-bold text-primary">
              {isLoading ? '...' : analytics?.activity_trend.reduce((sum, day) => sum + day.activities_published, 0) || 0}
            </div>
          </div>
        </button>

        {/* Botão 3: Performance por Turma */}
        <button
          onClick={() => setOpenModal('class-performance')}
          className="group relative h-[140px] rounded-xl overflow-hidden
                     backdrop-blur-xl bg-white/5 border border-white/10
                     hover:bg-white/10 hover:scale-105 hover:border-warning/40
                     transition-all duration-300 ease-out
                     flex flex-col items-start justify-between p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 w-full">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-8 w-8 text-warning" />
              <div className="text-left">
                <h3 className="font-bold text-lg">Performance por Turma</h3>
                <p className="text-xs text-muted-foreground">
                  Comparativo de classes
                </p>
              </div>
            </div>
            <div className="text-lg font-bold text-warning truncate">
              {isLoading ? '...' : analytics?.worst_class_name || 'N/A'}
            </div>
          </div>
        </button>

        {/* Botão 4: Análise de Engajamento */}
        <button
          onClick={() => setOpenModal('post-engagement')}
          className="group relative h-[140px] rounded-xl overflow-hidden
                     backdrop-blur-xl bg-white/5 border border-white/10
                     hover:bg-white/10 hover:scale-105 hover:border-success/40
                     transition-all duration-300 ease-out
                     flex flex-col items-start justify-between p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 w-full">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="h-8 w-8 text-success" />
              <div className="text-left">
                <h3 className="font-bold text-lg">Análise de Engajamento</h3>
                <p className="text-xs text-muted-foreground">
                  Leituras e interações
                </p>
              </div>
            </div>
            <div className="text-3xl font-bold text-success">
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

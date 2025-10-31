import { useState } from 'react';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { useExecutiveDashboard } from '@/hooks/useExecutiveDashboard';
import { useClassesComparison } from '@/hooks/useClassesComparison';
import { useActivitiesLibrary } from '@/hooks/useActivitiesLibrary';
import { useTemporalHeatmap } from '@/hooks/useTemporalHeatmap';
import { usePostReadAnalytics } from '@/hooks/usePostReadAnalytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertTriangle, TrendingUp, Users, AlertCircle, BookOpen, Phone, Calendar, FileText, 
  UserCheck, Mail, Bell, Book, TrendingDown, FileDown, Trophy, ArrowDown, Send, Eye,
  Gauge, BarChart3, Library, Clock
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ActivityTrendChart } from '@/components/admin/ActivityTrendChart';
import { ClassPerformanceSection } from '@/components/admin/ClassPerformanceSection';
import { PostReadAnalytics } from '@/components/admin/PostReadAnalytics';
import { PredictiveInsightsDashboard } from '@/components/admin/PredictiveInsightsDashboard';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PieChart, Pie, BarChart, Bar, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, 
  Tooltip as RechartsTooltip, Legend, LineChart, Line 
} from 'recharts';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function AdminAnalyticsPage() {
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [openModal, setOpenModal] = useState<
    | 'executive' 
    | 'classes-comparison' 
    | 'activities-library' 
    | 'temporal-heatmap'
    | 'students-at-risk' 
    | 'activity-trend' 
    | 'class-performance' 
    | 'post-engagement' 
    | null
  >(null);

  // Hooks para dados reais
  const { data: analytics, isLoading, error } = useAdminAnalytics(daysFilter);
  const { data: executive, isLoading: loadingExecutive } = useExecutiveDashboard(daysFilter);
  const { data: classesComparison, isLoading: loadingClasses } = useClassesComparison(daysFilter);
  const { data: activitiesLib, isLoading: loadingActivities } = useActivitiesLibrary(90);
  const { data: heatmap, isLoading: loadingHeatmap } = useTemporalHeatmap(daysFilter);
  const { data: postReadData, isLoading: loadingPostReads } = usePostReadAnalytics(daysFilter);

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
            Sistema completo de analytics em tempo real
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

      {/* KPIs Grid (Não Clicáveis) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* KPI 1: Alunos em Risco */}
        <div className="group relative h-40 rounded-2xl overflow-hidden
                        backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                        border-2 border-destructive/30 hover:border-destructive/60
                        shadow-lg hover:shadow-2xl hover:shadow-destructive/20
                        transition-all duration-500 hover:scale-102 hover:-translate-y-2
                        cursor-default">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-destructive/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-destructive/10 rounded-full blur-2xl animate-ping" />
          </div>
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
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-warning/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-warning/10 rounded-full blur-2xl animate-ping" />
          </div>
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
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-ping" />
          </div>
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
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-success/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-success/10 rounded-full blur-2xl animate-ping" />
          </div>
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

      {/* FILEIRA SUPERIOR - NOVOS BOTÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        {/* BOTÃO 1: Dashboard Executivo */}
        <button
          onClick={() => setOpenModal('executive')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                     border-2 border-blue-500/30 hover:border-blue-500/60
                     shadow-lg hover:shadow-2xl hover:shadow-blue-500/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl animate-ping" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 p-6">
            <Gauge className="h-12 w-12 text-blue-500 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-xl mb-1">Dashboard Executivo</h3>
              <p className="text-xs text-muted-foreground">KPIs e Score de Saúde</p>
            </div>
            <div className="text-4xl font-bold text-blue-500">
              {loadingExecutive ? '...' : `${executive?.health_score || 0}%`}
            </div>
          </div>
        </button>

        {/* BOTÃO 2: Comparativo de Turmas */}
        <button
          onClick={() => setOpenModal('classes-comparison')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                     border-2 border-purple-500/30 hover:border-purple-500/60
                     shadow-lg hover:shadow-2xl hover:shadow-purple-500/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl animate-ping" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 p-6">
            <BarChart3 className="h-12 w-12 text-purple-500 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-xl mb-1">Comparativo de Turmas</h3>
              <p className="text-xs text-muted-foreground">Ranking e Performance</p>
            </div>
            <div className="text-4xl font-bold text-purple-500">
              {loadingClasses ? '...' : classesComparison?.length || 0}
            </div>
          </div>
        </button>

        {/* BOTÃO 3: Biblioteca de Atividades */}
        <button
          onClick={() => setOpenModal('activities-library')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                     border-2 border-amber-500/30 hover:border-amber-500/60
                     shadow-lg hover:shadow-2xl hover:shadow-amber-500/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl animate-ping" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 p-6">
            <Library className="h-12 w-12 text-amber-500 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-xl mb-1">Biblioteca de Atividades</h3>
              <p className="text-xs text-muted-foreground">Análise de Performance</p>
            </div>
            <div className="text-4xl font-bold text-amber-500">
              {loadingActivities ? '...' : activitiesLib?.activities?.length || 0}
            </div>
          </div>
        </button>

        {/* BOTÃO 4: Mapa de Calor Temporal */}
        <button
          onClick={() => setOpenModal('temporal-heatmap')}
          className="group relative h-40 rounded-2xl overflow-hidden
                     backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5
                     border-2 border-cyan-500/30 hover:border-cyan-500/60
                     shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl animate-ping" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 p-6">
            <Clock className="h-12 w-12 text-cyan-500 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            <div className="text-center">
              <h3 className="font-bold text-xl mb-1">Mapa de Calor Temporal</h3>
              <p className="text-xs text-muted-foreground">Padrões de Atividade</p>
            </div>
            <div className="text-2xl font-bold text-cyan-500">
              {loadingHeatmap ? '...' : 'Horários'}
            </div>
          </div>
        </button>
      </div>

      {/* FILEIRA INFERIOR - BOTÕES EXISTENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
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
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-destructive/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-destructive/10 rounded-full blur-2xl animate-ping" />
          </div>
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
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-ping" />
          </div>
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
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-warning/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-warning/10 rounded-full blur-2xl animate-ping" />
          </div>
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
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-0 left-0 w-16 h-16 bg-success/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-success/10 rounded-full blur-2xl animate-ping" />
          </div>
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

      {/* MODAL 1: Dashboard Executivo */}
      <Dialog open={openModal === 'executive'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-6 w-6 text-blue-500" />
              Dashboard Executivo
            </DialogTitle>
            <DialogDescription>
              Visão geral dos principais indicadores de performance
            </DialogDescription>
          </DialogHeader>

          {loadingExecutive ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : executive ? (
            <div className="space-y-6">
              {/* Score de Saúde */}
              <Card>
                <CardHeader>
                  <CardTitle>Score de Saúde da Plataforma</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Score', value: executive.health_score },
                              { name: 'Restante', value: 100 - executive.health_score }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#e5e7eb" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-blue-500">
                            {executive.health_score}%
                          </div>
                          <div className="text-sm text-muted-foreground">Saúde</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KPIs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total de Alunos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{executive.total_students}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ativos Hoje</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {executive.active_students_today}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {executive.active_students_change > 0 ? '+' : ''}
                      {executive.active_students_change}% vs ontem
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Atividades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{executive.total_activities}</div>
                    <div className="text-xs text-muted-foreground">
                      {executive.activities_today} hoje
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Entregas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{executive.total_deliveries}</div>
                    <div className="text-xs text-muted-foreground">
                      {executive.deliveries_today} hoje
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Pendentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500">
                      {executive.pending_evaluations}
                    </div>
                    <div className="text-xs text-muted-foreground">avaliações</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Média Geral</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-500">
                      {executive.avg_grade}
                    </div>
                    <div className="text-xs text-muted-foreground">nota média</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Nenhum dado disponível</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Comparativo de Turmas */}
      <Dialog open={openModal === 'classes-comparison'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-purple-500" />
              Comparativo de Turmas
            </DialogTitle>
            <DialogDescription>
              Ranking e análise comparativa de performance entre turmas
            </DialogDescription>
          </DialogHeader>

          {loadingClasses ? (
            <Skeleton className="h-96 w-full" />
          ) : classesComparison && classesComparison.length > 0 ? (
            <div className="space-y-6">
              {/* Gráfico de Barras */}
              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Conclusão por Turma</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={classesComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="completion_rate" fill="#8b5cf6" name="Taxa de Conclusão (%)" />
                      <Bar dataKey="avg_grade" fill="#3b82f6" name="Média de Notas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tabela Detalhada */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por Turma</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Turma</TableHead>
                        <TableHead className="text-center">Alunos</TableHead>
                        <TableHead className="text-center">Ativos 7d</TableHead>
                        <TableHead className="text-center">Atividades</TableHead>
                        <TableHead className="text-center">Entregas</TableHead>
                        <TableHead className="text-center">Taxa Conclusão</TableHead>
                        <TableHead className="text-center">Média</TableHead>
                        <TableHead className="text-center">Tempo Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classesComparison.map((cls) => (
                        <TableRow key={cls.id}>
                          <TableCell className="font-medium">{cls.name}</TableCell>
                          <TableCell className="text-center">{cls.total_students}</TableCell>
                          <TableCell className="text-center">{cls.active_students_7d}</TableCell>
                          <TableCell className="text-center">{cls.total_activities}</TableCell>
                          <TableCell className="text-center">{cls.total_deliveries}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={cls.completion_rate >= 70 ? 'default' : 'destructive'}>
                              {cls.completion_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={cls.avg_grade >= 70 ? 'default' : 'destructive'}>
                              {cls.avg_grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {cls.avg_delivery_time_days} dias
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Nenhuma turma encontrada</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Biblioteca de Atividades */}
      <Dialog open={openModal === 'activities-library'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-6 w-6 text-amber-500" />
              Biblioteca de Atividades
            </DialogTitle>
            <DialogDescription>
              Análise detalhada de performance de todas as atividades
            </DialogDescription>
          </DialogHeader>

          {loadingActivities ? (
            <Skeleton className="h-96 w-full" />
          ) : activitiesLib ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">Todas ({activitiesLib.activities?.length || 0})</TabsTrigger>
                <TabsTrigger value="top">Top Performers ({activitiesLib.top_performers?.length || 0})</TabsTrigger>
                <TabsTrigger value="low">Baixo Engajamento ({activitiesLib.low_engagement?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Visualizações</TableHead>
                      <TableHead className="text-center">Entregas</TableHead>
                      <TableHead className="text-center">No Prazo</TableHead>
                      <TableHead className="text-center">Atrasadas</TableHead>
                      <TableHead className="text-center">Média</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activitiesLib.activities?.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{activity.type}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{activity.total_views}</TableCell>
                        <TableCell className="text-center">{activity.total_deliveries}</TableCell>
                        <TableCell className="text-center text-green-600">
                          {activity.on_time_deliveries}
                        </TableCell>
                        <TableCell className="text-center text-red-600">
                          {activity.late_deliveries}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={activity.avg_grade >= 70 ? 'default' : 'destructive'}>
                            {activity.avg_grade}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="top" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Atividades com Melhor Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-center">Entregas</TableHead>
                          <TableHead className="text-center">Aprovadas</TableHead>
                          <TableHead className="text-center">Média</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activitiesLib.top_performers?.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell className="font-medium">{activity.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{activity.type}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{activity.deliveries}</TableCell>
                            <TableCell className="text-center text-green-600">
                              {activity.approved_deliveries}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default">{activity.avg_grade}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default" className="bg-amber-500">
                                {activity.success_score.toFixed(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="low" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Atividades com Baixo Engajamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-center">Visualizações</TableHead>
                          <TableHead className="text-center">Entregas</TableHead>
                          <TableHead className="text-center">Taxa Engajamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activitiesLib.low_engagement?.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell className="font-medium">{activity.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{activity.type}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{activity.total_views}</TableCell>
                            <TableCell className="text-center">{activity.total_deliveries}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="destructive">{activity.engagement_rate}%</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Nenhuma atividade encontrada</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Mapa de Calor Temporal */}
      <Dialog open={openModal === 'temporal-heatmap'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-cyan-500" />
              Mapa de Calor Temporal
            </DialogTitle>
            <DialogDescription>
              Análise de padrões de atividade por dia da semana e horário
            </DialogDescription>
          </DialogHeader>

          {loadingHeatmap ? (
            <Skeleton className="h-96 w-full" />
          ) : heatmap ? (
            <div className="space-y-6">
              {/* Melhores Horários para Publicar */}
              <Card>
                <CardHeader>
                  <CardTitle>Melhores Horários para Publicar Atividades</CardTitle>
                  <CardDescription>
                    Baseado na taxa de sucesso (entregas recebidas / atividades publicadas)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dia da Semana</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead className="text-center">Atividades Publicadas</TableHead>
                        <TableHead className="text-center">Entregas Recebidas</TableHead>
                        <TableHead className="text-center">Taxa de Sucesso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {heatmap.best_publish_times?.map((time, idx) => {
                        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                        return (
                          <TableRow key={idx}>
                            <TableCell>{days[time.day_of_week]}</TableCell>
                            <TableCell>{time.hour}:00</TableCell>
                            <TableCell className="text-center">{time.activities_published}</TableCell>
                            <TableCell className="text-center">{time.deliveries_received}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default" className="bg-cyan-500">
                                {(time.success_rate * 100).toFixed(0)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Gráfico de Logins */}
              <Card>
                <CardHeader>
                  <CardTitle>Padrão de Logins por Horário</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={heatmap.login_heatmap}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" label={{ value: 'Hora do Dia', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Quantidade de Logins', angle: -90, position: 'insideLeft' }} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#06b6d4" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Entregas */}
              <Card>
                <CardHeader>
                  <CardTitle>Padrão de Entregas por Horário</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={heatmap.delivery_heatmap}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" label={{ value: 'Hora do Dia', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Quantidade de Entregas', angle: -90, position: 'insideLeft' }} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Nenhum dado disponível</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Alunos em Risco (EXISTENTE) */}
      <Sheet open={openModal === 'students-at-risk'} onOpenChange={() => setOpenModal(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Alunos em Risco de Evasão
            </SheetTitle>
            <SheetDescription>
              Lista de alunos que precisam de atenção imediata
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : analytics?.students_at_risk_list && analytics.students_at_risk_list.length > 0 ? (
              analytics.students_at_risk_list.map((student) => (
                <Card key={student.student_id} className="border-destructive/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{student.student_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {student.class_name}
                        </CardDescription>
                      </div>
                      <Badge variant="destructive" className="ml-2">
                        Risco Alto
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Último login:</span>
                        <span className="font-medium">
                          {student.days_since_last_login} dias atrás
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Pendentes:</span>
                        <span className="font-medium text-destructive">
                          {student.pending_deliveries}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Phone className="h-4 w-4 mr-2" />
                        Ligar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Send className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Alert>
                <UserCheck className="h-4 w-4" />
                <AlertDescription>
                  Nenhum aluno em risco identificado no momento.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* MODAL 6: Tendência de Atividades (EXISTENTE) */}
      <Dialog open={openModal === 'activity-trend'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Tendência de Atividades e Entregas
            </DialogTitle>
            <DialogDescription>
              Evolução temporal das atividades publicadas e entregas realizadas
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : analytics?.activity_trend ? (
            <div className="space-y-6">
              <ActivityTrendChart data={analytics.activity_trend} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {analytics.activity_trend.reduce((sum, day) => sum + day.activities_published, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nos últimos {daysFilter} dias
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total de Entregas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-success">
                      {analytics.activity_trend.reduce((sum, day) => sum + day.deliveries_made, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nos últimos {daysFilter} dias
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-500">
                      {(() => {
                        const totalActivities = analytics.activity_trend.reduce((sum, day) => sum + day.activities_published, 0);
                        const totalDeliveries = analytics.activity_trend.reduce((sum, day) => sum + day.deliveries_made, 0);
                        return totalActivities > 0 ? Math.round((totalDeliveries / totalActivities) * 100) : 0;
                      })()}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Média do período
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Nenhum dado disponível para o período selecionado</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 7: Performance por Turma (EXISTENTE) */}
      <Dialog open={openModal === 'class-performance'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-warning" />
              Performance por Turma
            </DialogTitle>
            <DialogDescription>
              Análise comparativa de desempenho entre turmas
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            <ClassPerformanceSection daysFilter={daysFilter} />
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 8: Análise de Engajamento (EXISTENTE) */}
      <Dialog open={openModal === 'post-engagement'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-success" />
              Análise de Engajamento
            </DialogTitle>
            <DialogDescription>
              Métricas de leitura e interação com conteúdos publicados
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            <PostReadAnalytics daysFilter={daysFilter} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

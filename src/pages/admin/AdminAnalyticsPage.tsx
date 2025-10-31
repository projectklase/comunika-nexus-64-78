import { useState } from 'react';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingUp, Users, AlertCircle, BookOpen, Phone, Calendar, FileText, UserCheck, Mail, Bell, Book, TrendingDown, FileDown, Trophy, ArrowDown, Send, Eye } from 'lucide-react';
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
import { PieChart, Pie, BarChart, Bar, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, LineChart, Line } from 'recharts';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { StudentAtRisk } from '@/types/admin-analytics';

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

      {/* Modal 1: Alunos em Risco - Advanced with Tabs */}
      <Dialog open={openModal === 'students-at-risk'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden backdrop-blur-xl bg-background/95 border border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Alunos em Risco de Evasão
            </DialogTitle>
            <DialogDescription>
              Análise completa de alunos que necessitam atenção imediata
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="visao-geral" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="detalhamento">Detalhamento</TabsTrigger>
              <TabsTrigger value="acoes">Ações</TabsTrigger>
              <TabsTrigger value="tendencias">Tendências</TabsTrigger>
            </TabsList>
            
            <div className="overflow-y-auto max-h-[calc(90vh-250px)] mt-4 pr-2">
              {/* Tab 1: Visão Geral */}
              <TabsContent value="visao-geral" className="space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : analytics && analytics.students_at_risk_list.length > 0 ? (
                  <>
                    {/* KPIs */}
                    <div className="grid md:grid-cols-3 gap-4">
                      {(() => {
                        const criticoCount = analytics.students_at_risk_list.filter(s => 
                          (s.days_since_last_login ?? 0) >= 14 && s.pending_deliveries >= 5
                        ).length;
                        const moderadoCount = analytics.students_at_risk_list.filter(s => 
                          (s.days_since_last_login ?? 0) >= 10 && s.pending_deliveries >= 3 && 
                          !((s.days_since_last_login ?? 0) >= 14 && s.pending_deliveries >= 5)
                        ).length;
                        
                        return (
                          <>
                            <Card className="border-destructive/50">
                              <CardHeader>
                                <CardTitle className="text-sm">Risco Crítico</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-3xl font-bold text-destructive">{criticoCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  ≥14 dias + ≥5 pendentes
                                </p>
                              </CardContent>
                            </Card>

                            <Card className="border-warning/50">
                              <CardHeader>
                                <CardTitle className="text-sm">Risco Moderado</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-3xl font-bold text-warning">{moderadoCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  ≥10 dias ou ≥3 pendentes
                                </p>
                              </CardContent>
                            </Card>

                            <Card className="border-success/50">
                              <CardHeader>
                                <CardTitle className="text-sm">Taxa de Intervenção</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-3xl font-bold text-success">0%</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {/* Mock - TODO: Implementar tracking */}
                                </p>
                              </CardContent>
                            </Card>
                          </>
                        );
                      })()}
                    </div>

                    {/* Gráficos */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Gráfico Pizza */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Distribuição por Tipo de Risco</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const tipoRisco = analytics.students_at_risk_list.map(s => {
                              const diasInativo = s.days_since_last_login ?? 0;
                              const pendentes = s.pending_deliveries;
                              
                              if (diasInativo === 0 && pendentes > 0) return 'Apenas Pendentes';
                              if (diasInativo > 0 && pendentes === 0) return 'Apenas Inatividade';
                              if (diasInativo > 0 && pendentes > 0) return 'Duplo Risco';
                              return 'Outro';
                            });

                            const pieData = [
                              { name: 'Apenas Pendentes', value: tipoRisco.filter(t => t === 'Apenas Pendentes').length, fill: 'hsl(var(--warning))' },
                              { name: 'Apenas Inatividade', value: tipoRisco.filter(t => t === 'Apenas Inatividade').length, fill: 'hsl(var(--primary))' },
                              { name: 'Duplo Risco', value: tipoRisco.filter(t => t === 'Duplo Risco').length, fill: 'hsl(var(--destructive))' },
                            ].filter(d => d.value > 0);

                            return (
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label />
                                  <RechartsTooltip />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            );
                          })()}
                        </CardContent>
                      </Card>

                      {/* Gráfico Barras */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Alunos em Risco por Turma</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const porTurma = analytics.students_at_risk_list.reduce((acc, s) => {
                              const turma = s.class_name || 'Sem Turma';
                              acc[turma] = (acc[turma] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);

                            const barData = Object.entries(porTurma)
                              .map(([name, count]) => ({ turma: name, alunos: count }))
                              .sort((a, b) => b.alunos - a.alunos)
                              .slice(0, 10);

                            return (
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barData} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" />
                                  <YAxis dataKey="turma" type="category" width={120} />
                                  <RechartsTooltip />
                                  <Bar dataKey="alunos" fill="hsl(var(--destructive))" />
                                </BarChart>
                              </ResponsiveContainer>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Gráfico Radar - Top 5 Casos Críticos */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Top 5 Casos Críticos</CardTitle>
                        <CardDescription>Análise multidimensional dos alunos em maior risco</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const top5 = analytics.students_at_risk_list
                            .map(s => ({
                              name: s.student_name.split(' ').slice(0, 2).join(' '),
                              'Dias Inativo': s.days_since_last_login ?? 0,
                              'Pendentes': s.pending_deliveries,
                              'Avaliações': s.pending_evaluations,
                            }))
                            .sort((a, b) => (b['Dias Inativo'] + b.Pendentes * 2) - (a['Dias Inativo'] + a.Pendentes * 2))
                            .slice(0, 5);

                          return (
                            <ResponsiveContainer width="100%" height={400}>
                              <RadarChart data={top5}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="name" />
                                <PolarRadiusAxis angle={90} domain={[0, 30]} />
                                <Radar name="Dias Inativo" dataKey="Dias Inativo" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} />
                                <Radar name="Pendentes" dataKey="Pendentes" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.3} />
                                <Radar name="Avaliações" dataKey="Avaliações" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                                <Legend />
                                <RechartsTooltip />
                              </RadarChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      ✅ Ótimas notícias! Nenhum aluno identificado em risco de evasão no momento.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Tab 2: Detalhamento */}
              <TabsContent value="detalhamento" className="space-y-4">
                {isLoading ? (
                  <Skeleton className="h-96 w-full" />
                ) : analytics?.students_at_risk_list.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      ✅ Nenhum aluno em risco identificado.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Lista Completa de Alunos em Risco</CardTitle>
                      <CardDescription>Detalhamento com severidade calculada</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Turma</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Dias Inativo</TableHead>
                            <TableHead className="text-right">Pendentes</TableHead>
                            <TableHead className="text-right">Avaliações</TableHead>
                            <TableHead>Severidade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics?.students_at_risk_list.map((student) => {
                            const dias = student.days_since_last_login ?? 0;
                            const pendentes = student.pending_deliveries;
                            
                            let severity: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } = { label: 'MODERADO', variant: 'secondary' };
                            if (dias >= 14 && pendentes >= 5) {
                              severity = { label: 'CRÍTICO', variant: 'destructive' };
                            } else if (dias >= 10 || pendentes >= 4) {
                              severity = { label: 'ALTO', variant: 'default' };
                            }

                            return (
                              <TableRow key={student.student_id}>
                                <TableCell className="font-medium">{student.student_name}</TableCell>
                                <TableCell>{student.class_name || 'Sem turma'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {student.days_since_last_login === null ? 'Nunca logou' : 'Inativo'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {student.days_since_last_login ?? 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">{student.pending_deliveries}</TableCell>
                                <TableCell className="text-right">{student.pending_evaluations}</TableCell>
                                <TableCell>
                                  <Badge variant={severity.variant}>{severity.label}</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 3: Ações */}
              <TabsContent value="acoes" className="space-y-6">
                {(() => {
                  if (isLoading) return <Skeleton className="h-96 w-full" />;
                  if (!analytics || analytics.students_at_risk_list.length === 0) {
                    return (
                      <Alert>
                        <AlertDescription>
                          Nenhuma ação necessária no momento.
                        </AlertDescription>
                      </Alert>
                    );
                  }

                  const criticoCount = analytics.students_at_risk_list.filter(s => 
                    (s.days_since_last_login ?? 0) >= 14 && s.pending_deliveries >= 5
                  ).length;
                  const moderadoCount = analytics.students_at_risk_list.filter(s => 
                    (s.days_since_last_login ?? 0) >= 10 && s.pending_deliveries >= 3 && 
                    !((s.days_since_last_login ?? 0) >= 14 && s.pending_deliveries >= 5)
                  ).length;

                  return (
                    <>
                      <Alert className="border-primary/50 bg-primary/5">
                        <AlertCircle className="h-5 w-5" />
                        <AlertDescription>
                          <strong>Protocolo de Intervenção:</strong> Alunos em risco crítico devem ser contatados em até 24h. 
                          Alunos em risco moderado devem receber notificações automáticas e suporte pedagógico.
                        </AlertDescription>
                      </Alert>

                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Card Risco Crítico */}
                        <Card className="border-destructive/50 bg-destructive/5">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                              <AlertTriangle className="h-5 w-5" />
                              Risco Crítico ({criticoCount} alunos)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-start gap-2">
                              <Phone className="h-4 w-4 mt-1 text-destructive" />
                              <p className="text-sm">Contato telefônico imediato com responsáveis</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Calendar className="h-4 w-4 mt-1 text-destructive" />
                              <p className="text-sm">Agendar reunião presencial em 48h</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 mt-1 text-destructive" />
                              <p className="text-sm">Criar plano de ação individualizado</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <UserCheck className="h-4 w-4 mt-1 text-destructive" />
                              <p className="text-sm">Designar tutor de acompanhamento</p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card Risco Moderado */}
                        <Card className="border-warning/50 bg-warning/5">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-warning">
                              <AlertCircle className="h-5 w-5" />
                              Risco Moderado ({moderadoCount} alunos)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-start gap-2">
                              <Mail className="h-4 w-4 mt-1 text-warning" />
                              <p className="text-sm">Enviar email de reengajamento</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Bell className="h-4 w-4 mt-1 text-warning" />
                              <p className="text-sm">Notificações push personalizadas</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Book className="h-4 w-4 mt-1 text-warning" />
                              <p className="text-sm">Disponibilizar material de apoio</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Users className="h-4 w-4 mt-1 text-warning" />
                              <p className="text-sm">Sugerir grupos de estudo</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="destructive" className="flex-1">
                          <Mail className="mr-2 h-4 w-4" />
                          Enviar Emails em Massa
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Calendar className="mr-2 h-4 w-4" />
                          Agendar Reuniões
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </TabsContent>

              {/* Tab 4: Tendências */}
              <TabsContent value="tendencias" className="space-y-6">
                {isLoading ? (
                  <Skeleton className="h-96 w-full" />
                ) : analytics && analytics.students_at_risk_list.length > 0 ? (
                  <>
                    {(() => {
                      const criticoCount = analytics.students_at_risk_list.filter(s => 
                        (s.days_since_last_login ?? 0) >= 14 && s.pending_deliveries >= 5
                      ).length;
                      const moderadoCount = analytics.students_at_risk_list.filter(s => 
                        (s.days_since_last_login ?? 0) >= 10 && s.pending_deliveries >= 3 && 
                        !((s.days_since_last_login ?? 0) >= 14 && s.pending_deliveries >= 5)
                      ).length;

                      // Mock data - evolução nos últimos 30 dias
                      const trendData = Array.from({ length: 30 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (29 - i));
                        return {
                          data: format(date, 'dd/MM'),
                          Crítico: Math.max(0, Math.floor(Math.random() * 5) + criticoCount - 2),
                          Alto: Math.max(0, Math.floor(Math.random() * 8) + moderadoCount - 4),
                          Moderado: Math.max(0, Math.floor(Math.random() * 10) + 5),
                        };
                      });

                      return (
                        <>
                          <Card>
                            <CardHeader>
                              <CardTitle>Evolução do Risco ao Longo do Tempo</CardTitle>
                              <CardDescription>
                                Últimos 30 dias (dados de exemplo)
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={350}>
                                <AreaChart data={trendData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="data" />
                                  <YAxis />
                                  <RechartsTooltip />
                                  <Legend />
                                  <Area type="monotone" dataKey="Crítico" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" />
                                  <Area type="monotone" dataKey="Alto" stackId="1" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" />
                                  <Area type="monotone" dataKey="Moderado" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>

                          <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4 text-success" />
                                  Tendência Positiva
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">
                                  5 alunos saíram do grupo de risco nos últimos 7 dias. {/* Mock */}
                                </p>
                                <Badge variant="outline" className="mt-2 border-success text-success">-12% esta semana</Badge>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-warning" />
                                  Novos Casos
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">
                                  3 novos alunos identificados em risco moderado esta semana. {/* Mock */}
                                </p>
                                <Badge variant="outline" className="mt-2 border-warning text-warning">+3 novos</Badge>
                              </CardContent>
                            </Card>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Nenhum dado de tendência disponível.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setOpenModal(null)}>
              Fechar
            </Button>
            <Button variant="default">
              <FileDown className="mr-2 h-4 w-4" />
              Exportar Relatório PDF
            </Button>
            <Button variant="destructive">
              <Users className="mr-2 h-4 w-4" />
              Acionar Equipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Tendência de Atividades - Enhanced */}
      <Dialog open={openModal === 'activity-trend'} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden backdrop-blur-xl bg-background/95 border border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <TrendingUp className="h-6 w-6 text-primary" />
              Tendência de Atividades
            </DialogTitle>
            <DialogDescription>
              Análise temporal completa de publicações e entregas
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] mt-4 pr-2 space-y-6">
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : analytics?.activity_trend && analytics.activity_trend.length > 0 ? (
              <>
                {/* KPIs Principais */}
                {(() => {
                  const totalPublicadas = analytics.activity_trend.reduce((sum, d) => sum + d.activities_published, 0);
                  const totalEntregas = analytics.activity_trend.reduce((sum, d) => sum + d.deliveries_made, 0);
                  const taxaConversao = totalPublicadas > 0 ? ((totalEntregas / totalPublicadas) * 100).toFixed(1) : '0';
                  const mediaDiaria = (totalPublicadas / analytics.activity_trend.length).toFixed(1);

                  const picoDay = analytics.activity_trend.reduce((max, d) => 
                    d.activities_published > max.activities_published ? d : max
                  , analytics.activity_trend[0]);

                  return (
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card className="border-success/50">
                        <CardHeader>
                          <CardTitle className="text-sm">Taxa de Conversão</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-success">{taxaConversao}%</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {totalEntregas} entregas de {totalPublicadas} publicadas
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-primary/50">
                        <CardHeader>
                          <CardTitle className="text-sm">Média Diária</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-primary">{mediaDiaria}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Atividades publicadas por dia
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-warning/50">
                        <CardHeader>
                          <CardTitle className="text-sm">Pico de Atividade</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-warning">{picoDay.activities_published}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Em {format(parseISO(picoDay.date), 'dd/MM/yyyy')}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

                {/* ActivityTrendChart MAIOR */}
                <Card>
                  <CardHeader>
                    <CardTitle>Evolução Temporal</CardTitle>
                    <CardDescription>Atividades publicadas vs entregas realizadas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] w-full">
                      <ActivityTrendChart data={analytics.activity_trend} />
                    </div>
                  </CardContent>
                </Card>

                {/* BarChart Comparativo Semanal */}
                {(() => {
                  const semanas = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
                  const semanaData = semanas.map((sem, i) => {
                    const inicio = i * 7;
                    const fim = Math.min(inicio + 7, analytics.activity_trend.length);
                    const subset = analytics.activity_trend.slice(inicio, fim);
                    return {
                      semana: sem,
                      Publicadas: subset.reduce((s, d) => s + d.activities_published, 0),
                      Entregas: subset.reduce((s, d) => s + d.deliveries_made, 0),
                    };
                  }).filter(s => s.Publicadas > 0 || s.Entregas > 0);

                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle>Comparativo Semanal</CardTitle>
                        <CardDescription>Distribuição de atividades por semana</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={semanaData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="semana" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="Publicadas" fill="hsl(var(--primary))" />
                            <Bar dataKey="Entregas" fill="hsl(var(--success))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Predição LineChart */}
                {(() => {
                  const totalPublicadas = analytics.activity_trend.reduce((sum, d) => sum + d.activities_published, 0);
                  const totalEntregas = analytics.activity_trend.reduce((sum, d) => sum + d.deliveries_made, 0);
                  const avgPublicadas = totalPublicadas / analytics.activity_trend.length;
                  const avgEntregas = totalEntregas / analytics.activity_trend.length;

                  const predicaoData = [
                    ...analytics.activity_trend.slice(-14).map(d => ({ ...d, isPrediction: false })),
                    ...Array.from({ length: 7 }, (_, i) => {
                      const futureDate = new Date();
                      futureDate.setDate(futureDate.getDate() + i + 1);
                      return {
                        date: format(futureDate, 'yyyy-MM-dd'),
                        activities_published: Math.round(avgPublicadas * (0.9 + Math.random() * 0.2)),
                        deliveries_made: Math.round(avgEntregas * (0.9 + Math.random() * 0.2)),
                        isPrediction: true,
                      };
                    })
                  ];

                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          Predição para Próximos 7 Dias
                          <Badge variant="outline" className="ml-2">Experimental</Badge>
                        </CardTitle>
                        <CardDescription>
                          Baseado na média móvel dos últimos {daysFilter} dias {/* Mock */}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={predicaoData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'dd/MM')} />
                            <YAxis />
                            <RechartsTooltip labelFormatter={(d) => format(parseISO(d), 'dd/MM/yyyy')} />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="activities_published" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              name="Publicadas"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="deliveries_made" 
                              stroke="hsl(var(--success))" 
                              strokeWidth={2}
                              name="Entregas"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-muted-foreground mt-4">
                          ⚠️ Esta predição é apenas uma estimativa baseada em dados históricos e pode não refletir eventos futuros.
                        </p>
                      </CardContent>
                    </Card>
                  );
                })()}
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  Nenhum dado disponível para o período selecionado.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenModal(null)}>
              Fechar
            </Button>
            <Button variant="default">
              <FileDown className="mr-2 h-4 w-4" />
              Exportar Análise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer 3: Performance por Turma - Enhanced */}
      <Sheet open={openModal === 'class-performance'} onOpenChange={() => setOpenModal(null)}>
        <SheetContent side="right" className="w-full sm:max-w-6xl overflow-y-auto backdrop-blur-xl bg-background/95 border-l border-white/10">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6 text-warning" />
              Performance por Turma
            </SheetTitle>
            <SheetDescription>
              Análise comparativa e detalhamento por classe
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Ranking de Turmas (Mock) */}
            {analytics && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Ranking de Turmas por Performance</CardTitle>
                    <CardDescription>
                      Baseado na taxa de entrega nos últimos {daysFilter} dias (dados de exemplo)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const rankingData = [
                        { turma: analytics.worst_class_name || 'Turma A', score: 45, pendentes: analytics.worst_class_pending_count },
                        { turma: 'Turma B', score: 67, pendentes: 8 },
                        { turma: 'Turma C', score: 78, pendentes: 5 },
                        { turma: 'Turma D', score: 85, pendentes: 3 },
                        { turma: 'Turma E', score: 92, pendentes: 1 },
                      ].sort((a, b) => b.score - a.score);

                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={rankingData} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis dataKey="turma" type="category" width={100} />
                            <RechartsTooltip />
                            <Bar dataKey="score" fill="hsl(var(--primary))" label={{ position: 'right' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Comparativo: Melhor vs Pior */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-success/50 bg-success/5">
                    <CardHeader>
                      <CardTitle className="text-success flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Melhor Turma
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">Turma E</p> {/* Mock */}
                      <p className="text-sm text-muted-foreground mt-2">
                        92% de taxa de entrega • 1 entrega pendente
                      </p>
                      <Badge variant="outline" className="mt-3 border-success text-success">
                        +15% vs média
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                      <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Turma de Atenção
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{analytics.worst_class_name || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {analytics.worst_class_pending_count} entregas pendentes
                      </p>
                      <Badge variant="outline" className="mt-3 border-destructive text-destructive">
                        Requer intervenção
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Componente existente */}
            <ClassPerformanceSection daysFilter={daysFilter} />

            {/* TODO: Drill-down */}
            {/* TODO: Implementar drill-down ao clicar em uma turma
              - Mostrar lista de alunos da turma
              - Filtrar students_at_risk_list por class_name
              - Adicionar botão "Ver Alunos" em cada card do ranking
            */}
          </div>
        </SheetContent>
      </Sheet>

      {/* Drawer 4: Análise de Engajamento - Enhanced */}
      <Sheet open={openModal === 'post-engagement'} onOpenChange={() => setOpenModal(null)}>
        <SheetContent side="right" className="w-full sm:max-w-6xl overflow-y-auto backdrop-blur-xl bg-background/95 border-l border-white/10">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <BookOpen className="h-6 w-6 text-success" />
              Análise de Engajamento
            </SheetTitle>
            <SheetDescription>
              Métricas avançadas de leituras e interações
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Funil de Conversão (Mock) */}
            <Card>
              <CardHeader>
                <CardTitle>Funil de Conversão</CardTitle>
                <CardDescription>
                  Da publicação até a aprovação nos últimos {daysFilter} dias (dados de exemplo)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const funilData = [
                    { etapa: 'Posts Publicados', quantidade: 45, taxa: 100 },
                    { etapa: 'Posts Lidos', quantidade: 38, taxa: 84 },
                    { etapa: 'Atividades Entregues', quantidade: 28, taxa: 62 },
                    { etapa: 'Aprovadas', quantidade: 24, taxa: 53 },
                  ];

                  return (
                    <div className="space-y-4">
                      {funilData.map((etapa, i) => (
                        <div key={i} className="relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{etapa.etapa}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-bold">{etapa.quantidade}</span>
                              <Badge variant={i === 0 ? 'default' : etapa.taxa >= 70 ? 'default' : etapa.taxa >= 40 ? 'secondary' : 'destructive'}>
                                {etapa.taxa}%
                              </Badge>
                            </div>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                i === 0 ? "bg-primary" : etapa.taxa >= 70 ? "bg-success" : etapa.taxa >= 40 ? "bg-warning" : "bg-destructive"
                              )}
                              style={{ width: `${etapa.taxa}%` }}
                            />
                          </div>
                          {i < funilData.length - 1 && (
                            <div className="flex items-center justify-center my-2">
                              <ArrowDown className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Heatmap de Engajamento (Mock) */}
            <Card>
              <CardHeader>
                <CardTitle>Heatmap de Engajamento</CardTitle>
                <CardDescription>
                  Horários de maior atividade por dia da semana (dados de exemplo)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const heatmapData = [
                    { dia: 'Segunda', manha: 12, tarde: 25, noite: 8 },
                    { dia: 'Terça', manha: 15, tarde: 30, noite: 10 },
                    { dia: 'Quarta', manha: 18, tarde: 28, noite: 12 },
                    { dia: 'Quinta', manha: 20, tarde: 32, noite: 15 },
                    { dia: 'Sexta', manha: 14, tarde: 20, noite: 5 },
                    { dia: 'Sábado', manha: 5, tarde: 8, noite: 3 },
                    { dia: 'Domingo', manha: 3, tarde: 6, noite: 2 },
                  ];

                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={heatmapData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dia" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="manha" stackId="a" fill="hsl(var(--primary))" name="Manhã (6-12h)" />
                        <Bar dataKey="tarde" stackId="a" fill="hsl(var(--warning))" name="Tarde (12-18h)" />
                        <Bar dataKey="noite" stackId="a" fill="hsl(var(--destructive))" name="Noite (18-24h)" />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Componente existente */}
            <PostReadAnalytics daysFilter={daysFilter} />

            {/* Ações Rápidas */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline">
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Todos os Posts
                  </Button>
                  <Button variant="outline">
                    <Send className="mr-2 h-4 w-4" />
                    Reenviar Notificações
                  </Button>
                  <Button variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar Relatório
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

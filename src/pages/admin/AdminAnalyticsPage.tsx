import { useState } from 'react';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminAnalyticsPage() {
  const [daysFilter, setDaysFilter] = useState<number>(30);
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
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Centro de Inteligência</h1>
          <p className="text-muted-foreground mt-2">
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

      {/* Tabela de Alunos em Risco */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Alunos em Risco de Evasão
          </CardTitle>
          <CardDescription>
            Top 10 alunos que necessitam atenção imediata
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Placeholder para Gráfico de Tendência (Fase 2) */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Tendência de Atividades</CardTitle>
          <CardDescription>
            Gráfico de linha comparando atividades publicadas vs. entregas realizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          📊 Gráfico de tendência será implementado na Fase 2
        </CardContent>
      </Card>
    </div>
  );
}

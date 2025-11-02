import { useState } from 'react';
import { useClassPerformance } from '@/hooks/useClassPerformance';
import { useClasses } from '@/hooks/useClasses';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, TrendingUp, CheckCircle2, XCircle, Clock, AlertCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClassPerformanceSectionProps {
  daysFilter: number;
}

export function ClassPerformanceSection({ daysFilter }: ClassPerformanceSectionProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const { classes, loading: isLoadingClasses } = useClasses();
  const { data: performance, isLoading: isLoadingPerformance } = useClassPerformance(selectedClassId, daysFilter);

  const activeClasses = classes?.filter(c => c.status === 'ATIVA') || [];

  return (
    <div className="space-y-6">
      {/* Seletor de Turma */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Análise de Performance por Turma
          </CardTitle>
          <CardDescription>
            Selecione uma turma para visualizar métricas detalhadas de desempenho
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingClasses ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={selectedClassId || ''}
              onValueChange={(value) => setSelectedClassId(value || null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                {activeClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Métricas de Performance */}
      {selectedClassId && (
        <>
          {isLoadingPerformance ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="glass">
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : performance ? (
            <>
              {/* Grid de Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total de Alunos */}
                <Card className="glass border-primary/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Total de Alunos
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Total de alunos matriculados na turma</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <Users className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.total_students}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {performance.active_students_last_7_days} ativos nos últimos 7 dias
                    </p>
                  </CardContent>
                </Card>

                {/* Taxa de Entrega */}
                <Card className="glass border-success/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Taxa de Entrega
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Percentual de entregas realizadas vs atividades atribuídas</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-success" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">
                      {performance.delivery_rate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {performance.total_deliveries} de {performance.total_activities_assigned * performance.total_students} possíveis
                    </p>
                  </CardContent>
                </Card>

                {/* Média de Dias para Entrega */}
                <Card className="glass border-warning/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Tempo Médio de Entrega
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Tempo médio entre publicação da atividade e entrega do aluno</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <Clock className="h-4 w-4 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">
                      {performance.avg_days_to_deliver !== null 
                        ? `${performance.avg_days_to_deliver.toFixed(1)} dias`
                        : 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Desde a publicação até a entrega
                    </p>
                  </CardContent>
                </Card>

                {/* Entregas Aprovadas */}
                <Card className="glass border-success/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Aprovadas
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Total de entregas aprovadas pelo professor no período</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">
                      {performance.approved_deliveries}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nos últimos {daysFilter} dias
                    </p>
                  </CardContent>
                </Card>

                {/* Entregas Devolvidas */}
                <Card className="glass border-destructive/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Devolvidas
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Entregas que foram devolvidas para correção</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {performance.returned_deliveries}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nos últimos {daysFilter} dias
                    </p>
                  </CardContent>
                </Card>

                {/* Entregas Atrasadas */}
                <Card className="glass border-warning/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Atrasadas
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Entregas realizadas após o prazo estabelecido</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">
                      {performance.late_deliveries}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Entregas após o prazo
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Resumo em Texto */}
              <Alert className="glass">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{performance.class_name}</strong> tem {performance.total_students} alunos matriculados, 
                  dos quais {performance.active_students_last_7_days} fizeram login nos últimos 7 dias. 
                  A taxa de entrega é de <strong>{performance.delivery_rate.toFixed(1)}%</strong> nos últimos {daysFilter} dias, 
                  com {performance.pending_deliveries} entregas aguardando avaliação.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erro ao carregar dados da turma. Tente novamente.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}

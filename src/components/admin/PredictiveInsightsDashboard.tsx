import { useState, useMemo } from 'react';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Zap,
  Target,
  Loader2,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { SeverityLevel, TrendLevel, PriorityLevel, AttendanceStatus, SchoolInsights } from '@/types/school-insights';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

function getSeverityConfig(severity: SeverityLevel) {
  const configs = {
    low: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2, label: 'Baixo Risco' },
    medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertTriangle, label: 'Risco Moderado' },
    high: { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle, label: 'Alto Risco' },
    critical: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle, label: 'Risco Crítico' },
  };
  return configs[severity];
}

function getTrendConfig(trend: TrendLevel) {
  const configs = {
    declining: { color: 'text-red-500', icon: TrendingDown, label: 'Em Declínio' },
    stable: { color: 'text-yellow-500', icon: TrendingUp, label: 'Estável' },
    growing: { color: 'text-green-500', icon: TrendingUp, label: 'Crescente' },
  };
  return configs[trend];
}

function getAttendanceStatusConfig(status: AttendanceStatus) {
  const configs = {
    critical: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle, label: 'Crítico' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertCircle, label: 'Atenção' },
    healthy: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2, label: 'Saudável' },
  };
  return configs[status];
}

function getPriorityConfig(priority: PriorityLevel) {
  const configs = {
    low: { variant: 'outline' as const, label: 'Baixa' },
    medium: { variant: 'secondary' as const, label: 'Média' },
    high: { variant: 'destructive' as const, label: 'Alta' },
  };
  return configs[priority];
}

export function PredictiveInsightsDashboard() {
  const { getSetting, isLoading, refetch } = useSchoolSettings();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Ler do banco
  const briefing = getSetting('ai_daily_briefing', { insights: null, generatedAt: null });
  const insights: SchoolInsights | null = briefing?.insights || null;
  const lastRun: string | null = briefing?.generatedAt || null;

  // Calcular se pode gerar (24h passadas)
  const canGenerate = useMemo(() => {
    if (!lastRun) return true; // Nunca gerou, pode gerar
    const now = new Date();
    const lastRunDate = new Date(lastRun);
    const hoursSinceLastRun = (now.getTime() - lastRunDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRun >= 24;
  }, [lastRun]);

  const hoursUntilNext = useMemo(() => {
    if (!lastRun) return 0;
    const now = new Date();
    const lastRunDate = new Date(lastRun);
    const hoursSinceLastRun = (now.getTime() - lastRunDate.getTime()) / (1000 * 60 * 60);
    return Math.max(0, 24 - hoursSinceLastRun);
  }, [lastRun]);

  const handleGenerateInsights = async () => {
    if (!canGenerate) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-briefing', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "✅ Análise Gerada com Sucesso!",
        description: "Os insights foram atualizados e estarão disponíveis em alguns segundos.",
      });

      // Aguardar 2s para o banco atualizar e recarregar
      setTimeout(() => {
        refetch();
      }, 2000);

    } catch (error: any) {
      console.error("Erro ao gerar insights:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Gerar Análise",
        description: error.message || "Tente novamente em alguns minutos.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!insights) {
    return (
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <span>Nenhuma análise gerada ainda. A análise diária é gerada automaticamente.</span>
        </AlertDescription>
      </Alert>
    );
  }
  const severityConfig = getSeverityConfig(insights.evasionInsights.severity);
  const trendConfig = getTrendConfig(insights.engagementInsights.trend);
  const SeverityIcon = severityConfig.icon;
  const TrendIcon = trendConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-2xl font-bold">Insights Preditivos com IA</h3>
          <p className="text-sm text-muted-foreground">
            {lastRun ? (
              `Última análise: ${formatDistanceToNow(new Date(lastRun), { 
                addSuffix: true, 
                locale: ptBR 
              })}`
            ) : (
              "Nenhuma análise gerada ainda"
            )}
          </p>
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card de Evasão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SeverityIcon className={`h-5 w-5 ${severityConfig.color}`} />
              Análise de Evasão
            </CardTitle>
            <CardDescription>
              <Badge className={severityConfig.bg + ' ' + severityConfig.color}>
                {severityConfig.label}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Predição
              </h4>
              <p className="text-sm text-muted-foreground">
                {insights.evasionInsights.prediction}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Recomendações</h4>
              <ul className="space-y-2">
                {insights.evasionInsights.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Card de Engajamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendIcon className={`h-5 w-5 ${trendConfig.color}`} />
              Análise de Engajamento
            </CardTitle>
            <CardDescription>
              <Badge className={trendConfig.color}>
                {trendConfig.label}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Análise
              </h4>
              <p className="text-sm text-muted-foreground">
                {insights.engagementInsights.analysis}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Oportunidades</h4>
              <ul className="space-y-2">
                {insights.engagementInsights.opportunities.map((opp, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Card de Presença (condicional) */}
        {insights.attendanceInsights && (() => {
          const attendanceConfig = getAttendanceStatusConfig(insights.attendanceInsights.status);
          const AttendanceIcon = attendanceConfig.icon;
          return (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className={`h-5 w-5 ${attendanceConfig.color}`} />
                  Análise de Frequência
                </CardTitle>
                <CardDescription>
                  <Badge className={attendanceConfig.bg + ' ' + attendanceConfig.color}>
                    <AttendanceIcon className="h-3 w-3 mr-1" />
                    {attendanceConfig.label}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Situação Atual
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {insights.attendanceInsights.summary}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Correlação com Evasão
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {insights.attendanceInsights.correlationWithEvasion}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Recomendações</h4>
                  <ul className="space-y-2">
                    {insights.attendanceInsights.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Ações Prioritárias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Ações Prioritárias
          </CardTitle>
          <CardDescription>
            Recomendações imediatas para gestores escolares
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.priorityActions.map((action, idx) => {
              const priorityConfig = getPriorityConfig(action.priority);
              return (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card/50"
                >
                  <div className="flex-shrink-0">
                    <Badge variant={priorityConfig.variant}>
                      {priorityConfig.label}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{action.action}</h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Impacto:</strong> {action.impact}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Predições */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Predições Futuras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Tendência Próxima Semana</h4>
            <p className="text-sm text-muted-foreground">
              {insights.predictions.nextWeekTrend}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Previsão de Risco</h4>
            <p className="text-sm text-muted-foreground">
              {insights.predictions.riskForecast}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

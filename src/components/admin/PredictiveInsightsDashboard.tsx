import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Zap,
  Target,
} from 'lucide-react';
import { SeverityLevel, TrendLevel, PriorityLevel, SchoolInsights } from '@/types/school-insights';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

function getPriorityConfig(priority: PriorityLevel) {
  const configs = {
    low: { variant: 'outline' as const, label: 'Baixa' },
    medium: { variant: 'secondary' as const, label: 'Média' },
    high: { variant: 'destructive' as const, label: 'Alta' },
  };
  return configs[priority];
}

export function PredictiveInsightsDashboard() {
  const { getSetting, isLoading } = useSchoolSettings();
  
  // Ler do banco
  const briefing = getSetting('ai_daily_briefing', { insights: null, generatedAt: null });
  const insights: SchoolInsights | null = briefing?.insights || null;
  const lastRun: string | null = briefing?.generatedAt || null;

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
          Aguardando primeira análise diária. O sistema gera insights automaticamente às 03h UTC (0h BRT).
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
      {/* Header read-only */}
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
              "Análise sendo processada..."
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

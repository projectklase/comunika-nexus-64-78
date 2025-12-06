import { 
  CreditCard, 
  TrendingUp,
  Users,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

const COLORS = ['hsl(var(--primary))', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function PlatformSubscriptions() {
  const { 
    metrics, 
    loadingMetrics,
    planDistribution,
    loadingPlanDistribution,
    schoolsOverview,
    loadingSchoolsOverview
  } = useSuperAdmin();

  const activeSubscriptions = schoolsOverview?.filter(s => s.subscription?.status === 'active') || [];
  const trialSubscriptions = schoolsOverview?.filter(s => s.subscription?.trial_ends_at && new Date(s.subscription.trial_ends_at) > new Date()) || [];
  const expiringSubscriptions = schoolsOverview?.filter(s => {
    if (!s.subscription?.expires_at) return false;
    const expiresAt = new Date(s.subscription.expires_at);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    return expiresAt <= in30Days && expiresAt > new Date();
  }) || [];

  const pieData = planDistribution?.map(p => ({
    name: p.plan_name,
    value: p.subscribers
  })) || [];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          Assinaturas
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie planos e assinaturas dos clientes
        </p>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                {loadingMetrics ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics?.mrr_cents || 0)}
                  </p>
                )}
                {metrics?.mrr_growth_pct !== undefined && metrics.mrr_growth_pct !== 0 && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${metrics.mrr_growth_pct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    <TrendingUp className="w-3 h-3" />
                    {metrics.mrr_growth_pct > 0 ? '+' : ''}{metrics.mrr_growth_pct}% vs mês anterior
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ARPU</p>
                {loadingMetrics ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics?.arpu_cents || 0)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Por assinatura ativa</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                {loadingMetrics ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{metrics?.active_subscriptions || 0}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">de {metrics?.total_subscriptions || 0} total</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Trial</p>
                {loadingSchoolsOverview ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{trialSubscriptions.length}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">conversões pendentes</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution Chart */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPlanDistribution ? (
              <Skeleton className="h-64 w-full" />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Expirando em 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSchoolsOverview ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : expiringSubscriptions.length > 0 ? (
              <div className="space-y-3">
                {expiringSubscriptions.map((school) => (
                  <div key={school.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-orange-500/20">
                    <Building2 className="w-8 h-8 text-orange-500" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{school.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {school.subscription?.plan_name} • Expira em {format(new Date(school.subscription!.expires_at!), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                      Renovar
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle className="w-12 h-12 text-green-500/30 mb-3" />
                <p>Nenhuma assinatura expirando em breve</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

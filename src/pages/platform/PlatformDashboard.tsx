import { useState } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Activity,
  Clock,
  Calendar,
  RefreshCw,
  Shield,
  ChevronRight,
  DollarSign,
  Eye,
  EyeOff,
  Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { usePlatformFeatureFlags } from '@/hooks/usePlatformFeatureFlags';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyPrizeCelebrationModal } from '@/components/gamification/WeeklyPrizeCelebrationModal';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function formatShortMonth(dateStr: string) {
  const date = new Date(dateStr);
  return format(date, 'MMM', { locale: ptBR });
}

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  loading,
  href,
  color = 'primary'
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType; 
  trend?: string;
  loading?: boolean;
  href?: string;
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'purple';
}) {
  const colorClasses = {
    primary: 'from-primary/20 to-primary/5 text-primary',
    green: 'from-green-500/20 to-green-500/5 text-green-500',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-500',
    orange: 'from-orange-500/20 to-orange-500/5 text-orange-500',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-500',
  };

  const content = (
    <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{value}</p>
            )}
            {trend && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {href && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <span className="text-xs text-muted-foreground group-hover:text-primary flex items-center gap-1 transition-colors">
              Ver detalhes <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}

interface Winner {
  user_id: string;
  name: string;
  avatar: string | null;
  equipped_avatar: { emoji?: string; imageUrl?: string } | null;
  total_xp: number;
  position: number;
  prize_xp: number;
}

export default function PlatformDashboard() {
  const { 
    metrics, 
    loadingMetrics, 
    refetchMetrics, 
    auditLogs, 
    loadingAuditLogs,
    mrrHistory,
    loadingMrrHistory,
    dailyLogins,
    loadingDailyLogins
  } = useSuperAdmin();
  
  const { flags, isLoading: loadingFlags, updateFlag, getFlag } = usePlatformFeatureFlags();
  const { toast } = useToast();
  
  // 🧪 TESTE: Estado para modal de premiação semanal
  const [showWeeklyPrizeTest, setShowWeeklyPrizeTest] = useState(false);
  const [weeklyWinners, setWeeklyWinners] = useState<Winner[]>([]);
  const [loadingWinners, setLoadingWinners] = useState(false);
  
  const handleTestWeeklyPrize = async () => {
    setLoadingWinners(true);
    try {
      // Buscar primeira escola ativa
      const { data: school } = await supabase
        .from('schools')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (school) {
        const { data } = await supabase.rpc('get_weekly_xp_rankings', {
          p_school_id: school.id,
          p_limit: 10
        });
        
        const PRIZES = [800, 500, 350, 100, 50, 25, 25, 25, 25, 25];
        const winners: Winner[] = ((data as any[]) || []).map((s, idx) => ({
          user_id: s.student_id,
          name: s.student_name,
          avatar: s.avatar,
          equipped_avatar: {
            emoji: s.equipped_avatar_emoji || undefined,
            imageUrl: s.equipped_avatar_image_url || undefined
          },
          total_xp: s.weekly_xp,
          position: s.rank_position,
          prize_xp: PRIZES[idx] || 25
        }));
        
        setWeeklyWinners(winners);
        setShowWeeklyPrizeTest(true);
      } else {
        toast({ title: 'Nenhuma escola ativa encontrada', variant: 'destructive' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao buscar rankings', variant: 'destructive' });
    }
    setLoadingWinners(false);
  };
  
  const handleToggleQuickLogins = async (enabled: boolean) => {
    const success = await updateFlag('quick_logins_visible', enabled);
    if (success) {
      toast({
        title: enabled ? 'Quick Logins ativados' : 'Quick Logins desativados',
        description: enabled 
          ? 'Os botões de demonstração agora estão visíveis na página de login.'
          : 'Os botões de demonstração foram ocultados da página de login.',
      });
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a configuração.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a plataforma Klase e seus clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Última atualização: {metrics?.generated_at ? format(new Date(metrics.generated_at), "HH:mm", { locale: ptBR }) : '--:--'}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetchMetrics()}
            className="bg-white/5 border-white/10 hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Main Metrics with MRR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="MRR"
          value={formatCurrency(metrics?.mrr_cents || 0)}
          icon={DollarSign}
          trend={metrics?.mrr_growth_pct ? `${metrics.mrr_growth_pct > 0 ? '+' : ''}${metrics.mrr_growth_pct}% vs mês anterior` : undefined}
          loading={loadingMetrics}
          href="/platform/subscriptions"
          color="green"
        />
        <MetricCard
          title="Total de Escolas"
          value={metrics?.total_schools || 0}
          icon={Building2}
          loading={loadingMetrics}
          href="/platform/schools"
          color="primary"
        />
        <MetricCard
          title="Escolas Ativas"
          value={metrics?.active_schools || 0}
          icon={Activity}
          loading={loadingMetrics}
          color="blue"
        />
        <MetricCard
          title="Assinaturas Ativas"
          value={metrics?.active_subscriptions || 0}
          icon={CreditCard}
          loading={loadingMetrics}
          href="/platform/subscriptions"
          color="orange"
        />
        <MetricCard
          title="Total de Usuários"
          value={metrics?.total_users || 0}
          icon={Users}
          loading={loadingMetrics}
          color="purple"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Administradores</p>
              {loadingMetrics ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <p className="text-xl font-bold">{metrics?.total_admins || 0}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Professores</p>
              {loadingMetrics ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <p className="text-xl font-bold">{metrics?.total_teachers || 0}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Secretárias</p>
              {loadingMetrics ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <p className="text-xl font-bold">{metrics?.total_secretarias || 0}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alunos</p>
              {loadingMetrics ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <p className="text-xl font-bold">{metrics?.total_students || 0}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Logins Hoje</p>
              {loadingMetrics ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <p className="text-xl font-bold">{metrics?.logins_today || 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR History Chart */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Evolução do MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMrrHistory ? (
              <Skeleton className="h-64 w-full" />
            ) : mrrHistory && mrrHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={mrrHistory}>
                  <defs>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="month_date" 
                    tickFormatter={formatShortMonth}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(v) => `R$${(v/100).toFixed(0)}`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'MRR']}
                    labelFormatter={(label) => format(new Date(label), "MMMM yyyy", { locale: ptBR })}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="mrr_cents" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorMrr)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Logins Chart */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Logins Diários (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDailyLogins ? (
              <Skeleton className="h-64 w-full" />
            ) : dailyLogins && dailyLogins.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyLogins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="login_date" 
                    tickFormatter={(d) => format(new Date(d), "dd/MM")}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Logins']}
                    labelFormatter={(label) => format(new Date(label), "dd/MM/yyyy", { locale: ptBR })}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="logins" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/platform/schools">
              <Button variant="outline" className="w-full justify-start gap-3 bg-white/5 border-white/10 hover:bg-white/10">
                <Building2 className="w-4 h-4 text-primary" />
                Gerenciar Escolas
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
            <Link to="/platform/admins">
              <Button variant="outline" className="w-full justify-start gap-3 bg-white/5 border-white/10 hover:bg-white/10">
                <Users className="w-4 h-4 text-blue-500" />
                Gerenciar Administradores
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
            <Link to="/platform/subscriptions">
              <Button variant="outline" className="w-full justify-start gap-3 bg-white/5 border-white/10 hover:bg-white/10">
                <CreditCard className="w-4 h-4 text-green-500" />
                Gerenciar Assinaturas
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
            
            {/* Quick Logins Toggle */}
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  {getFlag('quick_logins_visible') ? (
                    <Eye className="w-4 h-4 text-green-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Quick Logins Demo</p>
                    <p className="text-xs text-muted-foreground">
                      {getFlag('quick_logins_visible') ? 'Visível na página de login' : 'Oculto da página de login'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={getFlag('quick_logins_visible')}
                  onCheckedChange={handleToggleQuickLogins}
                  disabled={loadingFlags}
                />
              </div>
            </div>
            
            {/* 🧪 TESTE: Botão para testar modal de premiação */}
            <div className="pt-3 border-t border-white/10">
              <Button 
                variant="outline" 
                onClick={handleTestWeeklyPrize}
                disabled={loadingWinners}
                className="w-full justify-start gap-3 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-500"
              >
                <Trophy className="w-4 h-4" />
                🧪 Testar Modal Premiação Semanal
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Temporário - remover após testes
              </p>
            </div>
          </CardContent>
          
          {/* Modal de teste */}
          <WeeklyPrizeCelebrationModal
            open={showWeeklyPrizeTest}
            winners={weeklyWinners}
            myPosition={0}
            myPrize={0}
            onClose={() => setShowWeeklyPrizeTest(false)}
          />
        </Card>

        {/* Recent Platform Activity */}
        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Atividade Recente</CardTitle>
            <Link to="/platform/audit">
              <Button variant="ghost" size="sm" className="text-xs">
                Ver Todos
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingAuditLogs ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.slice(0, 5).map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {log.action} - {log.entity_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma atividade registrada ainda
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

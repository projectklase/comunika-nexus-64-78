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
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export default function PlatformDashboard() {
  const { metrics, loadingMetrics, refetchMetrics, auditLogs, loadingAuditLogs } = useSuperAdmin();

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

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          color="green"
        />
        <MetricCard
          title="Assinaturas Ativas"
          value={metrics?.active_subscriptions || 0}
          icon={CreditCard}
          loading={loadingMetrics}
          href="/platform/subscriptions"
          color="blue"
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
            <Link to="/platform/support">
              <Button variant="outline" className="w-full justify-start gap-3 bg-white/5 border-white/10 hover:bg-white/10">
                <Activity className="w-4 h-4 text-orange-500" />
                Central de Suporte
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          </CardContent>
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

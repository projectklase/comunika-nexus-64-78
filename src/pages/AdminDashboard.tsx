import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Coins,
  Calendar,
  MessageSquare,
  Award,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardMetrics {
  totalUsers: number;
  totalSecretarias: number;
  totalProfessores: number;
  totalAlunos: number;
  totalClasses: number;
  activeClasses: number;
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  totalDeliveries: number;
  pendingDeliveries: number;
  approvedDeliveries: number;
  rejectedDeliveries: number;
  totalKoins: number;
  totalRedemptions: number;
  pendingRedemptions: number;
  recentAudits: AuditEvent[];
}

interface AuditEvent {
  id: string;
  action: string;
  entity: string;
  entity_label: string;
  actor_name: string;
  actor_role: string;
  at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  const loadDashboardMetrics = async () => {
    setIsLoading(true);
    try {
      // Parallel queries for performance
      const [
        usersResult,
        secretariasResult,
        professoresResult,
        alunosResult,
        classesResult,
        activeClassesResult,
        postsResult,
        publishedPostsResult,
        scheduledPostsResult,
        deliveriesResult,
        pendingDeliveriesResult,
        approvedDeliveriesResult,
        rejectedDeliveriesResult,
        koinsResult,
        redemptionsResult,
        pendingRedemptionsResult,
        auditsResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'secretaria'),
        supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'professor'),
        supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'aluno'),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'Ativa'),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'SCHEDULED'),
        supabase.from('deliveries').select('id', { count: 'exact', head: true }),
        supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('review_status', 'AGUARDANDO'),
        supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('review_status', 'APROVADA'),
        supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('review_status', 'REJEITADA'),
        supabase.from('profiles').select('koins'),
        supabase.from('redemption_requests').select('id', { count: 'exact', head: true }),
        supabase.from('redemption_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('audit_events').select('id, action, entity, entity_label, actor_name, actor_role, at').order('at', { ascending: false }).limit(10)
      ]);

      // Calculate total koins in circulation
      const totalKoins = koinsResult.data?.reduce((sum, profile) => sum + (profile.koins || 0), 0) || 0;

      setMetrics({
        totalUsers: usersResult.count || 0,
        totalSecretarias: secretariasResult.count || 0,
        totalProfessores: professoresResult.count || 0,
        totalAlunos: alunosResult.count || 0,
        totalClasses: classesResult.count || 0,
        activeClasses: activeClassesResult.count || 0,
        totalPosts: postsResult.count || 0,
        publishedPosts: publishedPostsResult.count || 0,
        scheduledPosts: scheduledPostsResult.count || 0,
        totalDeliveries: deliveriesResult.count || 0,
        pendingDeliveries: pendingDeliveriesResult.count || 0,
        approvedDeliveries: approvedDeliveriesResult.count || 0,
        rejectedDeliveries: rejectedDeliveriesResult.count || 0,
        totalKoins,
        totalRedemptions: redemptionsResult.count || 0,
        pendingRedemptions: pendingRedemptionsResult.count || 0,
        recentAudits: auditsResult.data || []
      });
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    trend,
    variant = 'default'
  }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    description?: string;
    trend?: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
  }) => {
    const variantStyles = {
      default: {
        gradient: 'from-blue-500/20 to-cyan-500/20',
        border: 'border-blue-500/30 hover:border-blue-500/60',
        shadow: 'hover:shadow-blue-500/20',
        particle1: 'bg-blue-500/20',
        particle2: 'bg-cyan-500/10',
        icon: 'text-blue-500'
      },
      success: {
        gradient: 'from-green-500/20 to-emerald-500/20',
        border: 'border-green-500/30 hover:border-green-500/60',
        shadow: 'hover:shadow-green-500/20',
        particle1: 'bg-green-500/20',
        particle2: 'bg-emerald-500/10',
        icon: 'text-green-500'
      },
      warning: {
        gradient: 'from-amber-500/20 to-yellow-500/20',
        border: 'border-amber-500/30 hover:border-amber-500/60',
        shadow: 'hover:shadow-amber-500/20',
        particle1: 'bg-amber-500/20',
        particle2: 'bg-yellow-500/10',
        icon: 'text-amber-500'
      },
      danger: {
        gradient: 'from-red-500/20 to-rose-500/20',
        border: 'border-red-500/30 hover:border-red-500/60',
        shadow: 'hover:shadow-red-500/20',
        particle1: 'bg-red-500/20',
        particle2: 'bg-rose-500/10',
        icon: 'text-red-500'
      }
    };

    const style = variantStyles[variant];

    return (
      <div className={`group relative h-40 rounded-2xl overflow-hidden backdrop-blur-md bg-gradient-to-br ${style.gradient} border-2 ${style.border} shadow-lg hover:shadow-2xl ${style.shadow} transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2`}>
        {/* Efeitos de partículas */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className={`absolute top-0 left-0 w-16 h-16 ${style.particle1} rounded-full blur-xl animate-pulse`} />
          <div className={`absolute bottom-0 right-0 w-20 h-20 ${style.particle2} rounded-full blur-2xl animate-ping`} style={{ animationDuration: '3s' }} />
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 h-full flex flex-col justify-center p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <Icon className={`h-5 w-5 ${style.icon} group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300`} />
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-500 font-medium">{trend}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Erro ao carregar métricas</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deliveryApprovalRate = metrics.totalDeliveries > 0 
    ? ((metrics.approvedDeliveries / metrics.totalDeliveries) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">
          Visão geral completa do sistema • Última atualização: {format(new Date(), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Usuários"
          value={metrics.totalUsers}
          icon={Users}
          description={`${metrics.totalAlunos} alunos • ${metrics.totalProfessores} professores • ${metrics.totalSecretarias} secretaria`}
          variant="default"
        />
        
        <MetricCard
          title="Turmas Ativas"
          value={`${metrics.activeClasses}/${metrics.totalClasses}`}
          icon={GraduationCap}
          description={`${metrics.totalClasses} turmas cadastradas`}
          variant="success"
        />
        
        <MetricCard
          title="Posts Publicados"
          value={metrics.publishedPosts}
          icon={MessageSquare}
          description={`${metrics.scheduledPosts} agendados`}
          variant="default"
        />
        
        <MetricCard
          title="Entregas Pendentes"
          value={metrics.pendingDeliveries}
          icon={Clock}
          description={`${deliveryApprovalRate}% taxa de aprovação`}
          variant={metrics.pendingDeliveries > 10 ? 'warning' : 'default'}
        />
      </div>

      {/* Métricas de Entregas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Entregas Aprovadas"
          value={metrics.approvedDeliveries}
          icon={CheckCircle}
          description={`${metrics.totalDeliveries} entregas totais`}
          variant="success"
        />
        
        <MetricCard
          title="Entregas Rejeitadas"
          value={metrics.rejectedDeliveries}
          icon={XCircle}
          description="Requer atenção"
          variant="danger"
        />
        
        <MetricCard
          title="Aguardando Revisão"
          value={metrics.pendingDeliveries}
          icon={AlertCircle}
          description="Ação necessária"
          variant="warning"
        />
      </div>

      {/* Gamificação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Koins em Circulação"
          value={metrics.totalKoins.toLocaleString('pt-BR')}
          icon={Coins}
          description="Moeda virtual do sistema"
          variant="default"
        />
        
        <MetricCard
          title="Resgates Totais"
          value={metrics.totalRedemptions}
          icon={Award}
          description="Recompensas solicitadas"
          variant="default"
        />
        
        <MetricCard
          title="Resgates Pendentes"
          value={metrics.pendingRedemptions}
          icon={Clock}
          description="Aguardando aprovação"
          variant={metrics.pendingRedemptions > 5 ? 'warning' : 'default'}
        />
      </div>

      {/* Atividade Recente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividade Recente do Sistema
          </CardTitle>
          <CardDescription>
            Últimas 10 ações registradas no sistema de auditoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {metrics.recentAudits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma atividade registrada ainda</p>
                </div>
              ) : (
                metrics.recentAudits.map((audit) => (
                  <div 
                    key={audit.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {audit.action.includes('CREATE') && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {audit.action.includes('UPDATE') && <Activity className="h-4 w-4 text-blue-600" />}
                      {audit.action.includes('DELETE') && <XCircle className="h-4 w-4 text-red-600" />}
                      {!audit.action.includes('CREATE') && !audit.action.includes('UPDATE') && !audit.action.includes('DELETE') && (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{audit.actor_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {audit.actor_role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {audit.action.replace(/_/g, ' ').toLowerCase()} • {audit.entity_label || audit.entity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(audit.at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso rápido às funcionalidades mais utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <a 
              href="/secretaria/cadastros/alunos"
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Gerenciar Alunos</p>
                <p className="text-xs text-muted-foreground">Cadastros e matrículas</p>
              </div>
            </a>

            <a 
              href="/secretaria/turmas"
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Gerenciar Turmas</p>
                <p className="text-xs text-muted-foreground">Classes e horários</p>
              </div>
            </a>

            <a 
              href="/secretaria/historico"
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Auditoria</p>
                <p className="text-xs text-muted-foreground">Histórico completo</p>
              </div>
            </a>

            <a 
              href="/secretaria/gerenciar-recompensas"
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <Award className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Recompensas</p>
                <p className="text-xs text-muted-foreground">Loja e resgates</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
        border: 'border-cyan-500/30',
        shadow: 'shadow-[0_0_15px_rgba(0,217,255,0.2)]',
        icon: 'text-cyan-400',
        value: 'text-cyan-400',
        glow: 'group-hover:shadow-[0_0_25px_rgba(0,217,255,0.4)]'
      },
      success: {
        border: 'border-green-500/30',
        shadow: 'shadow-[0_0_15px_rgba(0,255,65,0.2)]',
        icon: 'text-green-400',
        value: 'text-green-400',
        glow: 'group-hover:shadow-[0_0_25px_rgba(0,255,65,0.4)]'
      },
      warning: {
        border: 'border-amber-500/30',
        shadow: 'shadow-[0_0_15px_rgba(255,165,0,0.2)]',
        icon: 'text-amber-400',
        value: 'text-amber-400',
        glow: 'group-hover:shadow-[0_0_25px_rgba(255,165,0,0.4)]'
      },
      danger: {
        border: 'border-red-500/30',
        shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
        icon: 'text-red-400',
        value: 'text-red-400',
        glow: 'group-hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]'
      }
    };

    const styles = variantStyles[variant];

    return (
      <div className={`group relative bg-slate-950/50 backdrop-blur-sm rounded-lg border ${styles.border} ${styles.shadow} ${styles.glow} transition-all duration-300 hover:scale-[1.02] p-5`}>
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,255,65,0.05),transparent)] pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
                {title}
              </p>
              <div className={`text-4xl font-mono font-bold ${styles.value} tracking-tight`}>
                {value}
              </div>
            </div>
            <Icon className={`h-5 w-5 ${styles.icon} opacity-70 group-hover:opacity-100 transition-opacity`} strokeWidth={1.5} />
          </div>
          
          {description && (
            <p className="text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-3 mt-3">
              {description}
            </p>
          )}
          
          {trend && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
              <TrendingUp className={`h-3 w-3 ${styles.icon}`} />
              <span className={`text-xs font-mono ${styles.icon}`}>{trend}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-6 space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-10 w-96 bg-slate-900" />
          <Skeleton className="h-4 w-64 bg-slate-900" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-slate-900 rounded-lg" />
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
    <div className="min-h-screen bg-black p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-3 pb-4 border-b border-green-500/20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-mono font-bold tracking-tight text-white uppercase">
              <span className="text-green-400">///</span> Dashboard Administrativo
            </h1>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
              Sistema de Monitoramento
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-green-400">
              {format(new Date(), 'HH:mm:ss')}
            </div>
            <p className="text-xs font-mono text-slate-500 uppercase">
              {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 uppercase">Online</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Última atualização: {format(new Date(), 'HH:mm', { locale: ptBR })}</span>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
      <div className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-green-400 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-green-500/50 to-transparent" />
          <span>Status de Entregas</span>
          <div className="h-px flex-1 bg-gradient-to-l from-green-500/50 to-transparent" />
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
        
        {/* Barra de proporção visual */}
        <div className="bg-slate-950/50 backdrop-blur-sm rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono uppercase text-slate-400">Distribuição</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-slate-900">
            <div 
              className="bg-green-500 transition-all" 
              style={{ width: `${metrics.totalDeliveries > 0 ? (metrics.approvedDeliveries / metrics.totalDeliveries) * 100 : 0}%` }}
            />
            <div 
              className="bg-amber-500 transition-all" 
              style={{ width: `${metrics.totalDeliveries > 0 ? (metrics.pendingDeliveries / metrics.totalDeliveries) * 100 : 0}%` }}
            />
            <div 
              className="bg-red-500 transition-all" 
              style={{ width: `${metrics.totalDeliveries > 0 ? (metrics.rejectedDeliveries / metrics.totalDeliveries) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between mt-3 text-[10px] font-mono">
            <span className="text-green-400">{metrics.approvedDeliveries} aprovadas</span>
            <span className="text-amber-400">{metrics.pendingDeliveries} pendentes</span>
            <span className="text-red-400">{metrics.rejectedDeliveries} rejeitadas</span>
          </div>
        </div>
      </div>

      {/* Gamificação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
      <div className="bg-slate-950/50 backdrop-blur-sm rounded-lg border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-green-400" />
            <h2 className="text-sm font-mono uppercase tracking-wider text-white">
              System Activity Log
            </h2>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] border-green-500/30 text-green-400">
            {metrics.recentAudits.length} eventos
          </Badge>
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 font-mono text-xs">
            {metrics.recentAudits.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="uppercase tracking-wider">No events logged</p>
              </div>
            ) : (
              metrics.recentAudits.map((audit) => {
                const actionColor = 
                  audit.action.includes('CREATE') ? 'text-green-400' :
                  audit.action.includes('UPDATE') ? 'text-cyan-400' :
                  audit.action.includes('DELETE') ? 'text-red-400' :
                  'text-slate-400';
                
                const actionIcon = 
                  audit.action.includes('CREATE') ? '●' :
                  audit.action.includes('UPDATE') ? '◆' :
                  audit.action.includes('DELETE') ? '■' :
                  '○';
                
                return (
                  <div 
                    key={audit.id}
                    className="flex items-start gap-3 p-3 rounded border border-slate-800/50 bg-slate-900/20 hover:bg-slate-900/40 transition-colors group"
                  >
                    <span className={`${actionColor} mt-0.5`}>{actionIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-white">{audit.actor_name}</span>
                        <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400 uppercase">
                          {audit.actor_role}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        {audit.action.replace(/_/g, ' ').toLowerCase()} → {audit.entity_label || audit.entity}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-600 group-hover:text-slate-500 transition-colors whitespace-nowrap">
                      {format(new Date(audit.at), 'HH:mm:ss')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-950/50 backdrop-blur-sm rounded-lg border border-slate-800 p-6">
        <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-cyan-400" />
          Quick Access
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a 
            href="/secretaria/cadastros/alunos"
            className="group relative flex items-center gap-3 p-4 rounded-lg border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 hover:border-cyan-500/30 transition-all"
          >
            <Users className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-mono font-medium text-white">Alunos</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase">Gestão</p>
            </div>
          </a>

          <a 
            href="/secretaria/turmas"
            className="group relative flex items-center gap-3 p-4 rounded-lg border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 hover:border-green-500/30 transition-all"
          >
            <GraduationCap className="h-5 w-5 text-green-400 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-mono font-medium text-white">Turmas</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase">Classes</p>
            </div>
          </a>

          <a 
            href="/secretaria/historico"
            className="group relative flex items-center gap-3 p-4 rounded-lg border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 hover:border-amber-500/30 transition-all"
          >
            <Activity className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-mono font-medium text-white">Auditoria</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase">Histórico</p>
            </div>
          </a>

          <a 
            href="/secretaria/gerenciar-recompensas"
            className="group relative flex items-center gap-3 p-4 rounded-lg border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 hover:border-purple-500/30 transition-all"
          >
            <Award className="h-5 w-5 text-purple-400 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-mono font-medium text-white">Recompensas</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase">Loja</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

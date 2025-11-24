import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
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
import { 
  getActionLabel, 
  getEntityLabel, 
  getRoleLabel 
} from '@/utils/audit-helpers';
import { AuditEvent } from '@/types/audit';
import { FamilyMetricsWidget } from '@/components/admin/FamilyMetricsWidget';

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

export default function AdminDashboard() {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardMetrics();
  }, [currentSchool?.id]);

  const loadDashboardMetrics = async () => {
    // Guard clause - não carregar sem escola
    if (!currentSchool) {
      setMetrics(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // PASSO 1: Buscar turmas desta escola para filtrar usuários
      const { data: schoolClasses } = await supabase
        .from('classes')
        .select('id, main_teacher_id')
        .eq('school_id', currentSchool.id);

      const classIds = schoolClasses?.map(c => c.id) || [];
      const teacherIds = [...new Set(schoolClasses?.map(c => c.main_teacher_id).filter(Boolean) || [])];

      // PASSO 2: Buscar alunos E secretarias vinculados à escola via school_memberships
      const { data: studentMemberships } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'aluno');

      const { data: secretariaMemberships } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'secretaria');

      // ✅ NOVO: Buscar professores via school_memberships (consistente com alunos/secretarias)
      const { data: professorMemberships } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'professor');

      const studentIds = studentMemberships?.map(m => m.user_id) || [];
      const secretariaIds = secretariaMemberships?.map(m => m.user_id) || [];
      const professorIds = professorMemberships?.map(m => m.user_id) || [];

      // PASSO 3: Queries paralelas COM FILTROS por escola
      const [
        alunosResult,
        professoresResult,
        secretariasResult,
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
        // Alunos desta escola (via classIds)
        studentIds.length > 0 
          ? supabase.from('profiles').select('koins', { count: 'exact' }).in('id', studentIds)
          : { count: 0, data: [] },
        
        // Professores desta escola (via professorIds do school_memberships)
        professorIds.length > 0
          ? supabase.from('profiles').select('id', { count: 'exact', head: true })
              .in('id', professorIds)
          : { count: 0 },
        
        // Secretarias desta escola (via secretariaIds)
        secretariaIds.length > 0
          ? supabase.from('profiles').select('id', { count: 'exact', head: true })
              .in('id', secretariaIds)
          : { count: 0 },
        
        // Turmas
        supabase.from('classes').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id),
        
        supabase.from('classes').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id)
          .eq('status', 'Ativa'),
        
        // Posts
        supabase.from('posts').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id),
        
        supabase.from('posts').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id)
          .eq('status', 'PUBLISHED'),
        
        supabase.from('posts').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id)
          .eq('status', 'SCHEDULED'),
        
        // Entregas
        supabase.from('deliveries').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id),
        
        supabase.from('deliveries').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id)
          .eq('review_status', 'AGUARDANDO'),
        
        supabase.from('deliveries').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id)
          .eq('review_status', 'APROVADA'),
        
        supabase.from('deliveries').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id)
          .eq('review_status', 'REJEITADA'),
        
        // Koins (apenas dos alunos desta escola)
        studentIds.length > 0
          ? supabase.from('profiles').select('koins').in('id', studentIds)
          : { data: [] },
        
        // Resgates
        supabase.from('redemption_requests').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id),
        
        supabase.from('redemption_requests').select('id', { count: 'exact', head: true })
          .eq('school_id', currentSchool.id)
          .eq('status', 'PENDING'),
        
        // Auditoria
        supabase.from('audit_events')
          .select('id, action, entity, entity_id, entity_label, actor_id, actor_name, actor_email, actor_role, school_id, scope, class_name, at, meta, diff_json')
          .eq('school_id', currentSchool.id)
          .order('at', { ascending: false })
          .limit(10)
      ]);

      // Calculate total koins in circulation
      const totalKoins = (koinsResult.data || []).reduce((sum, profile) => {
        return sum + (profile.koins || 0);
      }, 0 as number);

      setMetrics({
        totalUsers: studentIds.length + professorIds.length + secretariaIds.length,
        totalSecretarias: secretariaIds.length,
        totalProfessores: professorIds.length,
        totalAlunos: studentIds.length,
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
        recentAudits: (auditsResult.data || []) as AuditEvent[]
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
        border: 'border-purple-500/30',
        shadow: 'shadow-lg hover:shadow-2xl hover:shadow-purple-500/20',
        icon: 'text-purple-400',
        value: 'text-purple-500',
        glow: 'hover:border-purple-500/60',
        gradient: 'bg-gradient-to-br from-purple-500/20 to-blue-500/20'
      },
      success: {
        border: 'border-green-500/30',
        shadow: 'shadow-lg hover:shadow-2xl hover:shadow-green-500/20',
        icon: 'text-green-400',
        value: 'text-green-500',
        glow: 'hover:border-green-500/60',
        gradient: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20'
      },
      warning: {
        border: 'border-amber-500/30',
        shadow: 'shadow-lg hover:shadow-2xl hover:shadow-amber-500/20',
        icon: 'text-amber-400',
        value: 'text-amber-500',
        glow: 'hover:border-amber-500/60',
        gradient: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
      },
      danger: {
        border: 'border-red-500/30',
        shadow: 'shadow-lg hover:shadow-2xl hover:shadow-red-500/20',
        icon: 'text-red-400',
        value: 'text-red-500',
        glow: 'hover:border-red-500/60',
        gradient: 'bg-gradient-to-br from-red-500/20 to-pink-500/20'
      }
    };

    const styles = variantStyles[variant];

  return (
    <div className={`group relative rounded-2xl overflow-hidden
                     backdrop-blur-md ${styles.gradient}
                     border-2 ${styles.border} ${styles.glow}
                     ${styles.shadow}
                     transition-all duration-500 hover:scale-102 hover:-translate-y-2
                     cursor-pointer p-5`}>
      {/* Efeito de partículas */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className={`absolute top-0 left-0 w-16 h-16 ${styles.value} opacity-20 rounded-full blur-xl animate-pulse`} />
        <div className={`absolute bottom-0 right-0 w-20 h-20 ${styles.value} opacity-10 rounded-full blur-2xl animate-ping`} />
      </div>
      
      {/* Conteúdo */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 group-hover:text-foreground transition-colors">
              {title}
            </p>
            <div className={`text-4xl font-bold ${styles.value} tracking-tight group-hover:scale-105 transition-transform origin-left`}>
              {value}
            </div>
          </div>
          <Icon className={`h-5 w-5 ${styles.icon} opacity-70 group-hover:opacity-100 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300`} strokeWidth={1.5} />
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground border-t border-white/10 pt-3 mt-3 group-hover:text-foreground/80 transition-colors">
            {description}
          </p>
        )}
        
        {trend && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <TrendingUp className={`h-3 w-3 ${styles.icon}`} />
            <span className={`text-xs font-medium ${styles.icon}`}>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8 space-y-8 max-w-7xl mx-auto">
        <div className="space-y-3">
          <Skeleton className="h-12 w-96 mx-auto" />
          <Skeleton className="h-6 w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
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
    <div className="min-h-screen bg-background p-8 space-y-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-bold gradient-text">Dashboard Administrativo</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Sistema de monitoramento e gestão
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-500">
            {format(new Date(), 'HH:mm:ss')}
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </p>
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
        <h2 className="text-lg font-bold text-foreground">
          Status de Entregas
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
        <div className="rounded-2xl backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 border-2 border-purple-500/30 p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-semibold text-foreground">Distribuição</span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden bg-white/5 shadow-inner">
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
          <div className="flex justify-between mt-4 text-xs font-medium">
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

      {/* Vínculos Familiares Widget */}
      <FamilyMetricsWidget />

      {/* Atividade Recente */}
      <div className="rounded-2xl backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 border-2 border-purple-500/30 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-foreground">
              Atividades Recentes
            </h2>
          </div>
          <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
            {metrics.recentAudits.length} eventos
          </Badge>
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 text-xs">
            {metrics.recentAudits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Nenhum evento registrado</p>
              </div>
            ) : (
              metrics.recentAudits.map((audit) => {
                const actionColor = 
                  audit.action.includes('CREATE') ? 'text-green-400' :
                  audit.action.includes('UPDATE') ? 'text-blue-400' :
                  audit.action.includes('DELETE') ? 'text-red-400' :
                  'text-muted-foreground';
                
                const actionIcon = 
                  audit.action.includes('CREATE') ? '●' :
                  audit.action.includes('UPDATE') ? '◆' :
                  audit.action.includes('DELETE') ? '■' :
                  '○';
                
                return (
            <div 
              key={audit.id}
              className="flex items-start gap-3 p-3 mx-2 rounded-xl border border-white/10 bg-gradient-to-r from-white/5 to-transparent hover:bg-white/10 hover:scale-[1.02] hover:-translate-y-1 hover:border-white/20 transition-all duration-300 cursor-pointer group shadow-sm"
            >
              <span className={`${actionColor} mt-0.5 text-lg`}>{actionIcon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-foreground group-hover:text-purple-300 transition-colors">{audit.actor_name}</span>
                  <Badge variant="outline" className="text-[9px] border-white/20 text-muted-foreground">
                    {getRoleLabel(audit.actor_role)}
                  </Badge>
                </div>
                <p className="text-muted-foreground group-hover:text-foreground/80 text-xs transition-colors">
                  {audit.action === 'ASSIGN' && audit.entity === 'TEACHER' && audit.class_name ? (
                    <>
                      {getActionLabel(audit.action as any)} → {audit.entity_label}
                      <span className="text-purple-400 ml-1">
                        (Turma: {audit.class_name})
                      </span>
                    </>
                  ) : (
                    <>{getActionLabel(audit.action as any)} → {audit.entity_label || getEntityLabel(audit.entity as any)}</>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end text-[10px] text-muted-foreground group-hover:text-foreground/60 transition-colors">
                <span className="whitespace-nowrap font-mono">
                  {format(new Date(audit.at), 'HH:mm:ss')}
                </span>
                <span className="whitespace-nowrap font-mono">
                  {format(new Date(audit.at), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

    </div>
  );
}

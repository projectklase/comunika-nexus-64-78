import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { deliveryService } from '@/services/delivery-service';
import { useClassStore } from '@/stores/class-store';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryTable } from '@/components/activities/DeliveryTable';
import { PendingStudentsTable } from '@/components/activities/PendingStudentsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ArrowLeft, 
  FileText, 
  FolderOpen, 
  ClipboardCheck,
  Users,
  Calendar,
  Clock,
  Eye,
  MessageSquare,
  Download,
  BarChart3,
  UserX
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ReviewStatus } from '@/types/delivery';
import { toast } from '@/hooks/use-toast';

const activityTypeConfig = {
  ATIVIDADE: { label: 'Atividade', icon: FileText, color: 'bg-secondary text-secondary-foreground' },
  TRABALHO: { label: 'Trabalho', icon: FolderOpen, color: 'bg-primary text-primary-foreground' },
  PROVA: { label: 'Prova', icon: ClipboardCheck, color: 'bg-destructive text-destructive-foreground' }
};

export default function ActivityDetail() {
  const { classId, postId } = useParams<{ classId: string; postId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { getKoinsEnabled } = useSchoolSettings();
  const koinsEnabled = getKoinsEnabled();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string | null>(null);
  
  // All data hooks MUST come before any conditional returns
  const { posts } = usePosts();
  const { classes } = useClassStore();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [classStudentsInfo, setClassStudentsInfo] = useState<{ id: string; name: string }[]>([]);
  const [metrics, setMetrics] = useState<any>({
    naoEntregue: 0,
    aguardando: 0,
    aprovadas: 0,
    devolvidas: 0,
    atrasadas: 0,
    percentualEntrega: 0,
    percentualAprovacao: 0,
    total: 0
  });

  // Effect to handle URL tab parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'entregas') {
      setActiveTab('deliveries');
    }
  }, [searchParams]);
  
  // Effect to load deliveries (with refresh trigger to force reload)
  useEffect(() => {
    if (!postId) return;
    
    const loadDeliveries = async () => {
      try {
        const result = await deliveryService.list({ postId });
        console.log('ActivityDetail - Loading deliveries for postId:', postId, 'Found:', result.length);
        setDeliveries(result);
      } catch (error) {
        console.error('Error loading deliveries:', error);
        setDeliveries([]);
      }
    };
    
    loadDeliveries();
  }, [postId, refreshTrigger]);
  
  // Effect to load metrics and student info
  useEffect(() => {
    if (!postId || !classId) return;
    
    const loadMetricsAndStudents = async () => {
      try {
        // Find the class to get student count
        const targetClass = classes.find(c => c.id === classId);
        if (!targetClass) return;
        
        const result = await deliveryService.getActivityMetrics(postId, targetClass.students.length || 0);
        setMetrics(result);

        // Fetch student names from profiles
        if (targetClass.students.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', targetClass.students);
          
          if (profiles) {
            setClassStudentsInfo(profiles.map(p => ({ id: p.id, name: p.name })));
          }
        }
      } catch (error) {
        console.error('Error loading metrics:', error);
      }
    };
    
    loadMetricsAndStudents();
  }, [postId, classId, classes, refreshTrigger]);

  // Now safe to do conditional returns - all hooks are called
  if (!user || !classId || !postId) {
    return <div>Parâmetros inválidos</div>;
  }

  // Buscar dados derivados
  const activity = posts.find(p => p.id === postId);
  const schoolClass = classes.find(c => c.id === classId);

  if (!activity || !schoolClass) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Atividade não encontrada</h2>
        <p className="text-muted-foreground mb-4">A atividade solicitada não existe ou foi removida.</p>
        <Button asChild>
          <Link to="/professor/atividades">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar às Atividades
          </Link>
        </Button>
      </div>
    );
  }

  // Configuração do tipo de atividade
  const typeConfig = activityTypeConfig[activity.type as keyof typeof activityTypeConfig];
  const TypeIcon = typeConfig.icon;

  const handleReview = async (deliveryIds: string[], reviewStatus: ReviewStatus, reviewNote?: string) => {
    setIsLoading(true);
    try {
      const { notificationStore } = await import('@/stores/notification-store');
      const { useRewardsStore } = await import('@/stores/rewards-store');
      
      // Process each delivery with notifications
      if (deliveryIds.length === 1) {
        const delivery = await deliveryService.review(deliveryIds[0], {
          reviewStatus,
          reviewNote,
          reviewedBy: user.id
        });
        
        // Note: Student notifications will be generated automatically by the delivery system
      } else {
        const deliveries = await deliveryService.reviewMultiple(deliveryIds, {
          reviewStatus,
          reviewNote,
          reviewedBy: user.id
        });
        
        // Note: Student notifications will be generated automatically by the delivery system
      }

      // Handle rewards for approved deliveries
      if (reviewStatus === 'APROVADA' && activity.activityMeta?.koinReward && activity.activityMeta.koinReward > 0) {
        try {
          // Get student IDs from approved deliveries
          const approvedDeliveries = deliveries.filter(d => deliveryIds.includes(d.id));
          const studentIds = approvedDeliveries.map(d => d.studentId);
          
          if (studentIds.length > 0) {
            const { data: { session } } = await supabase.auth.getSession();
            
            const response = await fetch(
              `https://yanspolqarficibgovia.supabase.co/functions/v1/grant-koin-bonus`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                  eventName: `Atividade: ${activity.title}`,
                  eventDescription: `Entrega aprovada`,
                  koinAmount: activity.activityMeta.koinReward,
                  studentIds: studentIds,
                  grantedBy: user.id
                })
              }
            );
            
            if (!response.ok) {
              const errorData = await response.json();
              console.error('[ActivityDetail] Erro ao conceder Koins:', errorData);
            } else {
              const result = await response.json();
              console.log('[ActivityDetail] Koins concedidos:', result);
            }
          }
        } catch (koinError) {
          console.error('[ActivityDetail] Erro ao conceder Koins:', koinError);
          // Não bloquear a aprovação se os Koins falharem
        }
      }

      toast({
        title: 'Revisão concluída',
        description: reviewStatus === 'APROVADA' 
          ? `${deliveryIds.length} entrega(s) aprovada(s)${activity.activityMeta?.koinReward ? ` (+${activity.activityMeta.koinReward} Koins)` : ''}`
          : `${deliveryIds.length} entrega(s) devolvida(s)`
      });
      
      // Force refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao processar a revisão.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsReceived = async (studentId: string, studentName: string) => {
    setIsLoading(true);
    try {
      await deliveryService.markAsReceived(postId, studentId, studentName, classId, user.id);
      toast({
        title: 'Entrega marcada',
        description: `Entrega de ${studentName} marcada como recebida manualmente.`
      });
      
      // Force refresh the deliveries list
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao marcar a entrega.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    // TODO: Implementar exportação CSV
    toast({
      title: 'Exportação',
      description: 'Funcionalidade de exportação em desenvolvimento.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/professor/dashboard">Professor</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/professor/atividades">Atividades</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{activity.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header - Responsivo */}
      <div className="flex flex-col gap-4">
        {/* Linha 1: Voltar + Ações */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" asChild className="p-0 h-auto">
            <Link to="/professor/atividades">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Voltar às Atividades</span>
              <span className="sm:hidden">Voltar</span>
            </Link>
          </Button>

          {/* Ações - Mobile: ícones | Desktop: com texto */}
          <div className="flex items-center gap-2">
            {/* Exportar CSV */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleExportCSV} className="sm:hidden min-h-11 min-w-11">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar CSV</TooltipContent>
            </Tooltip>
            <Button variant="outline" onClick={handleExportCSV} className="hidden sm:flex">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>

            {/* Ver Turma */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" asChild className="sm:hidden min-h-11 min-w-11">
                  <Link to={`/professor/turma/${classId}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver Turma</TooltipContent>
            </Tooltip>
            <Button asChild className="hidden sm:flex">
              <Link to={`/professor/turma/${classId}`}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Turma
              </Link>
            </Button>
          </div>
        </div>

        {/* Linha 2: Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium", typeConfig.color)}>
            <TypeIcon className="h-4 w-4" />
            {typeConfig.label}
          </div>
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {schoolClass.name}
          </Badge>
        </div>

        {/* Linha 3: Título responsivo */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">{activity.title}</h1>
        
        {/* Linha 4: Descrição */}
        {activity.body && (
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">{activity.body}</p>
        )}
      </div>

      {/* KPIs - Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card 
          className="cursor-pointer transition-all hover:bg-muted/50 hover:border-muted-foreground/30"
          onClick={() => { setActiveTab('pending'); setDeliveryStatusFilter(null); }}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{metrics.naoEntregue}</div>
            <div className="text-sm text-muted-foreground">Não entregue</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-all hover:bg-primary/10 hover:border-primary/30"
          onClick={() => { setActiveTab('deliveries'); setDeliveryStatusFilter('AGUARDANDO'); }}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{metrics.aguardando}</div>
            <div className="text-sm text-muted-foreground">Aguardando</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-all hover:bg-success/10 hover:border-success/30"
          onClick={() => { setActiveTab('deliveries'); setDeliveryStatusFilter('APROVADA'); }}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{metrics.aprovadas}</div>
            <div className="text-sm text-muted-foreground">Aprovadas</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-all hover:bg-destructive/10 hover:border-destructive/30"
          onClick={() => { setActiveTab('deliveries'); setDeliveryStatusFilter('DEVOLVIDA'); }}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{metrics.devolvidas}</div>
            <div className="text-sm text-muted-foreground">Devolvidas</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-all hover:bg-destructive/10 hover:border-destructive/30"
          onClick={() => { setActiveTab('deliveries'); setDeliveryStatusFilter('late'); }}
        >
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive/80">{metrics.atrasadas}</div>
            <div className="text-sm text-muted-foreground">Atrasadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); if (val !== 'deliveries') setDeliveryStatusFilter(null); }} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            <UserX className="h-4 w-4" />
            Pendentes ({metrics.naoEntregue})
          </TabsTrigger>
          <TabsTrigger value="deliveries">
            Entregas ({deliveries.length})
          </TabsTrigger>
          <TabsTrigger value="comments">Comentários</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Informações da Atividade */}
            <Card>
              <CardHeader>
                <CardTitle>Informações da Atividade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activity.dueAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Prazo: {format(new Date(activity.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Criada em: {format(new Date(activity.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Turma: {schoolClass.name} ({schoolClass.students.length} alunos)
                  </span>
                </div>

                {activity.attachments && activity.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Anexos da Atividade</h4>
                    <div className="space-y-1">
                      {activity.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4" />
                          <span>{attachment.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {koinsEnabled && activity.activityMeta?.koinReward && activity.activityMeta.koinReward > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-yellow-600 dark:text-yellow-400">
                      💰 {activity.activityMeta.koinReward} Koins
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Recompensa por entrega
                    </span>
                  </div>
                )}

                {activity.activityMeta && (
                  <div>
                    <h4 className="font-medium mb-2">Metadados</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {activity.activityMeta.peso && activity.activityMeta.usePeso !== false && (
                        <div>Peso: {activity.activityMeta.peso}</div>
                      )}
                      {activity.activityMeta.duracao && (
                        <div>Duração: {activity.activityMeta.duracao} minutos</div>
                      )}
                      {activity.activityMeta.local && (
                        <div>Local: {activity.activityMeta.local}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Taxa de Entrega</span>
                    <span className="font-medium">{metrics.percentualEntrega}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${metrics.percentualEntrega}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Taxa de Aprovação</span>
                    <span className="font-medium">{metrics.percentualAprovacao}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-success h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${metrics.percentualAprovacao}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="font-semibold text-lg">{deliveries.length}</div>
                      <div className="text-xs text-muted-foreground">Entregas</div>
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{metrics.total - deliveries.length}</div>
                      <div className="text-xs text-muted-foreground">Pendentes</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Alunos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PendingStudentsTable
                classStudents={classStudentsInfo}
                deliveries={deliveries}
                dueAt={activity.dueAt}
                onMarkAsReceived={handleMarkAsReceived}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle>Entregas dos Alunos</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryTable
                deliveries={deliveries}
                activityTitle={activity.title}
                onReview={handleReview}
                onMarkAsReceived={handleMarkAsReceived}
                isLoading={isLoading}
                initialStatusFilter={deliveryStatusFilter}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sistema de Comentários</h3>
              <p className="text-muted-foreground text-center">
                Funcionalidade de comentários em desenvolvimento.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
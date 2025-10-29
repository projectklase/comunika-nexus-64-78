import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useActivityFilters } from '@/hooks/useActivityFilters';
import { useActivityExport } from '@/hooks/useActivityExport';
import { getProfessorClasses } from '@/utils/professor-helpers';
import { deliveryStore } from '@/stores/delivery-store';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { TeacherPrefsService } from '@/services/teacher-prefs';
import { useNavigate } from 'react-router-dom';
import { usePostActions } from '@/hooks/usePostActions';
import { toast } from 'sonner';
import { ActivityFilters } from '@/components/activities/ActivityFilters';
import { useSelectValidation } from '@/hooks/useSelectValidation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  FolderOpen, 
  ClipboardCheck,
  ClipboardList,
  Eye,
  Edit,
  Copy,
  Archive,
  Download,
  Calendar,
  Clock,
  Users,
  Plus,
  FileSpreadsheet
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Post, ActivityType, PostStatus } from '@/types/post';
import { Link } from 'react-router-dom';

// Tokens padrão para evitar valores vazios
const DEFAULT_TOKENS = {
  ALL_CLASSES: 'ALL_CLASSES',
  ALL_TYPES: 'ALL_TYPES',
  ALL_STATUS: 'ALL_STATUS', 
  ALL_PERIODS: 'ALL_PERIODS',
  DUE_DATE: 'dueAt',
  CREATED_DATE: 'createdAt',
  ALPHABETICAL: 'title'
} as const;

interface ClassGroup {
  classId: string;
  className: string;
  activities: Post[];
  counters: {
    pendentes: number;
    aguardandoAprovacao: number;
    aprovadas: number;
    devolvidas: number;
    atrasadas: number;
  };
}

const activityTypeConfig = {
  ATIVIDADE: { label: 'Atividade', icon: FileText, color: 'bg-secondary text-secondary-foreground', textColor: 'text-secondary' },
  TRABALHO: { label: 'Trabalho', icon: FolderOpen, color: 'bg-primary text-primary-foreground', textColor: 'text-primary' },
  PROVA: { label: 'Prova', icon: ClipboardCheck, color: 'bg-destructive text-destructive-foreground', textColor: 'text-destructive' }
};

const statusColors = {
  pendentes: 'bg-muted text-muted-foreground',
  aguardandoAprovacao: 'bg-primary text-primary-foreground',
  aprovadas: 'bg-success text-success-foreground',
  devolvidas: 'bg-destructive text-destructive-foreground',
  atrasadas: 'bg-destructive/80 text-destructive-foreground'
};

export default function ProfessorActivities() {
  // ALL HOOKS MUST BE CALLED IN THE SAME ORDER EVERY TIME
  const { user } = useAuth();
  const { exportActivities } = useActivityExport();
  const { loadClasses } = useClassStore();
  const { loadPeople } = usePeopleStore();
  
  // Validate Select components in development
  useSelectValidation('ProfessorActivities');
  
  // State hooks - always called in same order
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>(DEFAULT_TOKENS.ALL_CLASSES);
  const [sortBy, setSortBy] = useState<'dueAt' | 'createdAt' | 'title'>(DEFAULT_TOKENS.DUE_DATE);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Data hooks - always called in same order
  const { posts: allPosts } = usePosts();
  const navigate = useNavigate();
  const { deletePost, duplicatePost, archivePost } = usePostActions();
  const { exportDeliveries } = useActivityExport();

  // Obter turmas do professor - this needs user but we handle it safely
  const professorClasses = useMemo(() => {
    if (!user) return [];
    return getProfessorClasses(user.id);
  }, [user]);
  
  const classIds = useMemo(() => professorClasses.map(c => c.id), [professorClasses]);
  const hasClasses = professorClasses.length > 0;

  const professorActivities = useMemo(() => {
    if (!user) return [];
    return allPosts.filter(post => {
      // Filtrar apenas atividades
      if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return false;
      
      // Filtrar apenas atividades das turmas do professor
      const postClasses = post.classIds || (post.classId ? [post.classId] : []);
      return postClasses.some(classId => classIds.includes(classId));
    });
  }, [allPosts, classIds, user]);

  // Aplicar filtros
  const {
    filteredPosts,
    filters,
    setTypeFilter,
    setStatusFilter,
    setDeadlineFilter,
    clearAllFilters
  } = useActivityFilters(professorActivities);

  // Calcular contadores usando delivery store - always called
  const [deliveryMetrics, setDeliveryMetrics] = useState<Record<string, any>>({});
  
  useEffect(() => {
    const loadMetrics = async () => {
      if (!user || !hasClasses) return;
      
      const metricsMap: Record<string, any> = {};
      
      for (const activity of professorActivities) {
        const schoolClass = professorClasses.find(c => 
          activity.classIds?.includes(c.id) || activity.classId === c.id
        );
        
        if (schoolClass) {
          const metrics = await deliveryStore.getActivityMetrics(
            activity.id, 
            schoolClass.students.length
          );
          metricsMap[activity.id] = metrics;
        }
      }
      
      setDeliveryMetrics(metricsMap);
    };
    
    loadMetrics();
  }, [user, hasClasses, professorActivities, professorClasses]);

  // Calcular contadores por status usando o delivery store - always called
  const finalFilteredPosts = useMemo(() => {
    let posts = [...filteredPosts];

    // Filtro de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      posts = posts.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.body?.toLowerCase().includes(query)
      );
    }

    // Filtro por turma
    if (selectedClass && selectedClass !== DEFAULT_TOKENS.ALL_CLASSES) {
      posts = posts.filter(post => {
        const postClasses = post.classIds || (post.classId ? [post.classId] : []);
        return postClasses.includes(selectedClass);
      });
    }

    // Ordenação
    posts.sort((a, b) => {
      switch (sortBy) {
        case 'dueAt':
          if (!a.dueAt && !b.dueAt) return 0;
          if (!a.dueAt) return 1;
          if (!b.dueAt) return -1;
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return posts;
  }, [filteredPosts, searchQuery, selectedClass, sortBy]);

  // Agrupar por turma - always called
  const groupedActivities = useMemo<ClassGroup[]>(() => {
    const groups: Record<string, ClassGroup> = {};

    finalFilteredPosts.forEach(activity => {
      const postClasses = activity.classIds || (activity.classId ? [activity.classId] : []);
      
      postClasses.forEach(classId => {
        const schoolClass = professorClasses.find(c => c.id === classId);
        if (!schoolClass) return;

        if (!groups[classId]) {
          groups[classId] = {
            classId,
            className: schoolClass.name,
            activities: [],
            counters: {
              pendentes: 0,
              aguardandoAprovacao: 0,
              aprovadas: 0,
              devolvidas: 0,
              atrasadas: 0
            }
          };
        }

        groups[classId].activities.push(activity);

        // Calcular contadores reais usando o delivery store (async)
        deliveryStore.getActivityMetrics(activity.id, schoolClass.students.length).then(metrics => {
          groups[classId].counters.pendentes += metrics.naoEntregue;
          groups[classId].counters.aguardandoAprovacao += metrics.aguardando;
          groups[classId].counters.aprovadas += metrics.aprovadas;
          groups[classId].counters.devolvidas += metrics.devolvidas;
          groups[classId].counters.atrasadas += metrics.atrasadas;
        });
      });
    });

    return Object.values(groups).sort((a, b) => a.className.localeCompare(b.className));
  }, [finalFilteredPosts, professorClasses]);

  // Effect hooks - always called in same order
  useEffect(() => {
    loadClasses();
    loadPeople();
  }, [loadClasses, loadPeople]);

  useEffect(() => {
    if (!user || isInitialized) return;

    const savedFilters = TeacherPrefsService.getActivityFilters(user.id);
    
    // Apply migrated values
    setSelectedClass(savedFilters.selectedClass);
    setSortBy(savedFilters.sortBy as 'dueAt' | 'createdAt' | 'title');
    setSearchQuery(savedFilters.searchQuery);
    
    setIsInitialized(true);
  }, [user, isInitialized]);

  useEffect(() => {
    if (!user || !isInitialized) return;

    TeacherPrefsService.saveActivityFilters(user.id, {
      selectedClass,
      sortBy,
      searchQuery
    });
  }, [user, selectedClass, sortBy, searchQuery, isInitialized]);

  // Early return AFTER all hooks
  if (!user || !isInitialized) {
    return null;
  }

  // Helper functions - defined outside of any conditional logic
  const toggleGroup = (classId: string) => {
    const newOpenGroups = new Set(openGroups);
    if (newOpenGroups.has(classId)) {
      newOpenGroups.delete(classId);
    } else {
      newOpenGroups.add(classId);
    }
    setOpenGroups(newOpenGroups);
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    
    if (isToday(date)) {
      return 'Hoje';
    } else if (isBefore(date, today)) {
      return 'Atrasado';
    } else {
      return format(date, "dd/MM", { locale: ptBR });
    }
  };

  // Handler: Editar
  const handleEditActivity = (activityId: string) => {
    navigate(`/professor/atividades/nova?edit=${activityId}`);
  };

  // Handler: Excluir (com confirmação)
  const handleDeleteActivity = async (activityId: string, activityTitle: string) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a atividade "${activityTitle}"?\n\n` +
      `Esta ação não pode ser desfeita e excluirá todas as entregas dos alunos.`
    );
    
    if (!confirmed) return;
    
    try {
      await deletePost(activityId);
      toast.success('Atividade excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      toast.error('Erro ao excluir atividade.');
    }
  };

  // Handler: Duplicar
  const handleDuplicateActivity = async (activityId: string) => {
    try {
      const authorName = user?.email || 'Professor';
      await duplicatePost(activityId, authorName);
      toast.success('Atividade duplicada com sucesso!');
    } catch (error) {
      console.error('Erro ao duplicar atividade:', error);
      toast.error('Erro ao duplicar atividade.');
    }
  };

  // Handler: Baixar entregas
  const handleDownloadActivity = async (activityId: string) => {
    const activity = finalFilteredPosts.find(p => p.id === activityId);
    if (!activity) {
      toast.error('Atividade não encontrada.');
      return;
    }

    try {
      await exportDeliveries(activityId, activity);
      toast.success('Download iniciado!');
    } catch (error) {
      console.error('Erro ao exportar entregas:', error);
      toast.error('Erro ao gerar o arquivo.');
    }
  };

  // Handler: Arquivar
  const handleArchiveActivity = async (activityId: string) => {
    try {
      await archivePost(activityId);
      toast.success('Atividade arquivada com sucesso!');
    } catch (error) {
      console.error('Erro ao arquivar atividade:', error);
      toast.error('Erro ao arquivar atividade.');
    }
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
            <BreadcrumbPage>Atividades</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Minhas Atividades</h1>
          <p className="text-muted-foreground">
            Gerencie todas as atividades das suas turmas
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => exportActivities(finalFilteredPosts)}
            disabled={finalFilteredPosts.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar ({finalFilteredPosts.length})
          </Button>
          <Button asChild>
            <Link to="/professor/atividades/nova">
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Linha 1: Busca e Turma */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={selectedClass} 
              onValueChange={setSelectedClass}
              disabled={!hasClasses}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue 
                  placeholder={hasClasses ? "Todas as turmas" : "Nenhuma turma atribuída"} 
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_TOKENS.ALL_CLASSES}>
                  {hasClasses ? 'Todas as turmas' : 'Nenhuma turma disponível'}
                </SelectItem>
                {professorClasses.map(schoolClass => {
                  // Convert ID to string and skip items without ID
                  if (!schoolClass.id) return null;
                  const stringId = String(schoolClass.id);
                  return (
                    <SelectItem key={stringId} value={stringId}>
                      {schoolClass.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_TOKENS.DUE_DATE}>Prazo</SelectItem>
                <SelectItem value={DEFAULT_TOKENS.CREATED_DATE}>Criação</SelectItem>
                <SelectItem value={DEFAULT_TOKENS.ALPHABETICAL}>Alfabética</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Linha 2: Filtros de Atividade */}
          <ActivityFilters
            selectedType={filters.type}
            selectedStatus={filters.status}
            selectedDeadline={filters.deadline}
            onTypeChange={setTypeFilter}
            onStatusChange={setStatusFilter}
            onDeadlineChange={setDeadlineFilter}
            onClearAll={clearAllFilters}
          />
        </CardContent>
      </Card>

      {/* Lista de Atividades Agrupadas */}
      <div className="space-y-4">
        {groupedActivities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery || filters.type || filters.status || filters.deadline
                  ? 'Tente ajustar os filtros para ver mais resultados.'
                  : 'Você ainda não possui atividades criadas.'}
              </p>
              <Button asChild>
                <Link to="/professor/atividades/nova">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Atividade
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          groupedActivities.map(group => (
            <Card key={group.classId}>
              <Collapsible 
                open={openGroups.has(group.classId)} 
                onOpenChange={() => toggleGroup(group.classId)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {openGroups.has(group.classId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Users className="h-5 w-5" />
                        <CardTitle className="text-lg">{group.className}</CardTitle>
                        <Badge variant="secondary">
                          {group.activities.length} atividade(s)
                        </Badge>
                      </div>

                      {/* Chips de resumo */}
                      <div className="flex gap-2 flex-wrap">
                        {group.counters.pendentes > 0 && (
                          <Badge className={statusColors.pendentes}>
                            {group.counters.pendentes} Pendentes
                          </Badge>
                        )}
                        {group.counters.aguardandoAprovacao > 0 && (
                          <Badge className={statusColors.aguardandoAprovacao}>
                            {group.counters.aguardandoAprovacao} Aguardando
                          </Badge>
                        )}
                        {group.counters.aprovadas > 0 && (
                          <Badge className={statusColors.aprovadas}>
                            {group.counters.aprovadas} Aprovadas
                          </Badge>
                        )}
                        {group.counters.devolvidas > 0 && (
                          <Badge className={statusColors.devolvidas}>
                            {group.counters.devolvidas} Devolvidas
                          </Badge>
                        )}
                        {group.counters.atrasadas > 0 && (
                          <Badge className={statusColors.atrasadas}>
                            {group.counters.atrasadas} Atrasadas
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {group.activities.map(activity => {
                        const typeConfig = activityTypeConfig[activity.type as keyof typeof activityTypeConfig];
                        const TypeIcon = typeConfig.icon;
                        
                        return (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              {/* Badge de tipo */}
                              <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium", typeConfig.color)}>
                                <TypeIcon className="h-3 w-3" />
                                {typeConfig.label}
                              </div>

                              {/* Informações da atividade */}
                               <div className="flex-1">
                                <h4 className="font-medium">{activity.title}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                  {activity.dueAt && (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatRelativeDate(activity.dueAt)}</span>
                                      <span>•</span>
                                      <span>{format(new Date(activity.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                    </div>
                                  )}
                                  {activity.activityMeta?.peso !== null && activity.activityMeta?.peso !== undefined && activity.activityMeta?.usePeso !== false && (
                                    <div className="flex items-center gap-1">
                                      <span>•</span>
                                      <span>Peso: {activity.activityMeta.peso}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Contadores reais do delivery store */}
                              <div className="flex items-center gap-4 text-sm">
                                {(() => {
                                  const metrics = deliveryMetrics[activity.id];
                                  return (
                                    <>
                                      <div className="text-center">
                                        <div className="font-medium">{metrics?.aprovadas || 0}</div>
                                        <div className="text-muted-foreground">Aprovadas</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-medium">{metrics?.aguardando || 0}</div>
                                        <div className="text-muted-foreground">Aguardando</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-medium">{metrics?.naoEntregue || 0}</div>
                                        <div className="text-muted-foreground">Pendentes</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-medium">{metrics?.atrasadas || 0}</div>
                                        <div className="text-muted-foreground">Atrasadas</div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Ações rápidas */}
                            <div className="flex items-center gap-1 ml-4">
                              <Button size="sm" variant="ghost" asChild>
                                <Link to={`/professor/turma/${group.classId}/atividade/${activity.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleEditActivity(activity.id)}
                                title="Editar atividade"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDuplicateActivity(activity.id)}
                                title="Duplicar atividade"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDownloadActivity(activity.id)}
                                title="Baixar entregas"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDeleteActivity(activity.id, activity.title)}
                                title="Excluir atividade"
                                className="text-destructive hover:text-destructive"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { usePosts } from '@/hooks/usePosts';
import { useActivityFilters } from '@/hooks/useActivityFilters';
import { useActivityExport } from '@/hooks/useActivityExport';
import { deliveryStore } from '@/stores/delivery-store';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { TeacherPrefsService } from '@/services/teacher-prefs';
import { useNavigate } from 'react-router-dom';
import { usePostActions } from '@/hooks/usePostActions';
import { toast } from 'sonner';
import { ActivityFilters } from '@/components/activities/ActivityFilters';
import { ConfirmDialog } from '@/components/ui/app-dialog/ConfirmDialog';
import { useSelectValidation } from '@/hooks/useSelectValidation';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileFilterSheet } from '@/components/feed/MobileFilterSheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';
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
  FileSpreadsheet,
  MoreVertical,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
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
    prazoEncerrado: number;
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
  prazoEncerrado: 'bg-warning text-warning-foreground'
};

export default function ProfessorActivities() {
  // ALL HOOKS MUST BE CALLED IN THE SAME ORDER EVERY TIME
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const { exportActivities } = useActivityExport();
  const { classes, loadClasses, loading: classesLoading } = useClassStore();
  const { loadPeople } = usePeopleStore();
  const isMobile = useIsMobile();
  
  // Validate Select components in development
  useSelectValidation('ProfessorActivities');
  
  // State hooks - always called in same order
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>(DEFAULT_TOKENS.ALL_CLASSES);
  const [sortBy, setSortBy] = useState<'dueAt' | 'createdAt' | 'title'>(DEFAULT_TOKENS.DUE_DATE);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [concludeDialog, setConcludeDialog] = useState<{
    isOpen: boolean;
    activityId: string | null;
    activityTitle: string;
  }>({
    isOpen: false,
    activityId: null,
    activityTitle: ''
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    activityId: string | null;
    activityTitle: string;
  }>({
    isOpen: false,
    activityId: null,
    activityTitle: ''
  });

  // Data hooks - always called in same order
  const { posts: allPosts, isLoading: postsLoading } = usePosts();
  const navigate = useNavigate();
  const { deletePost, duplicatePost, archivePost, concludePost } = usePostActions();
  const { exportDeliveries } = useActivityExport();

  // ✅ Filtrar turmas do professor com reatividade correta
  const professorClasses = useMemo(() => {
    if (!user?.id || !currentSchool?.id) return [];
    return classes.filter(c => 
      c.teachers?.includes(user.id) && 
      c.schoolId === currentSchool.id &&
      c.status === 'ATIVA'
    );
  }, [user?.id, currentSchool?.id, classes]);
  
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
              prazoEncerrado: 0
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
          groups[classId].counters.prazoEncerrado += metrics.atrasadas;
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

  // Contador de filtros ativos para mobile (MUST be before early return)
  const activeFiltersCount = useMemo(() => {
    return [
      filters.type,
      filters.status,
      filters.deadline,
      searchQuery,
      selectedClass !== DEFAULT_TOKENS.ALL_CLASSES ? selectedClass : null
    ].filter(Boolean).length;
  }, [filters.type, filters.status, filters.deadline, searchQuery, selectedClass]);

  // Estado combinado de loading
  const isDataLoading = postsLoading || classesLoading;
  
  // Mostrar loading ANTES de verificar dados vazios
  if (isDataLoading) {
    return <PageLoadingSkeleton message="Carregando atividades..." />;
  }
  
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

  // Handler: Abrir modal de confirmação para excluir
  const handleDeleteActivity = (activityId: string, activityTitle: string) => {
    setDeleteDialog({
      isOpen: true,
      activityId,
      activityTitle
    });
  };

  // Handler: Executar exclusão após confirmação
  const executeDeleteActivity = async () => {
    if (!deleteDialog.activityId) return;
    
    try {
      await deletePost(deleteDialog.activityId);
      toast.success('Atividade excluída com sucesso!');
      setDeleteDialog({ isOpen: false, activityId: null, activityTitle: '' });
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

  // Handler: Abrir modal de confirmação para concluir
  const handleConcludeActivity = (activityId: string, activityTitle: string) => {
    setConcludeDialog({
      isOpen: true,
      activityId,
      activityTitle
    });
  };

  // Handler: Executar conclusão após confirmação
  const executeConcludeActivity = async () => {
    if (!concludeDialog.activityId) return;
    
    try {
      await concludePost(concludeDialog.activityId);
      setConcludeDialog({ isOpen: false, activityId: null, activityTitle: '' });
    } catch (error) {
      console.error('Erro ao concluir atividade:', error);
      toast.error('Erro ao concluir atividade.');
    }
  };

  // Conteúdo dos filtros (reutilizado entre desktop e mobile)
  const FiltersContent = () => (
    <div className="space-y-3 sm:space-y-4">
      {/* Linha 1: Busca e Turma */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 min-h-11"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Select 
            value={selectedClass} 
            onValueChange={setSelectedClass}
            disabled={!hasClasses}
          >
            <SelectTrigger className="w-full sm:w-[200px] min-h-11 sm:min-h-10">
              <SelectValue 
                placeholder={hasClasses ? "Todas as turmas" : "Nenhuma turma atribuída"} 
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_TOKENS.ALL_CLASSES}>
                {hasClasses ? 'Todas as turmas' : 'Nenhuma turma disponível'}
              </SelectItem>
              {professorClasses.map(schoolClass => {
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
            <SelectTrigger className="w-full sm:w-[160px] min-h-11 sm:min-h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_TOKENS.DUE_DATE}>Prazo</SelectItem>
              <SelectItem value={DEFAULT_TOKENS.CREATED_DATE}>Criação</SelectItem>
              <SelectItem value={DEFAULT_TOKENS.ALPHABETICAL}>Alfabética</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-x-hidden">
      <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-0">
        {/* Breadcrumbs - Hidden on mobile */}
        <Breadcrumb className="hidden sm:block">
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">Minhas Atividades</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gerencie todas as atividades das suas turmas
            </p>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline"
              onClick={() => exportActivities(finalFilteredPosts)}
              disabled={finalFilteredPosts.length === 0}
              className="flex-1 sm:flex-none min-h-11 justify-center"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              <span className="sm:hidden">Exportar</span>
              <span className="hidden sm:inline">Exportar ({finalFilteredPosts.length})</span>
            </Button>
            <Button asChild className="flex-1 sm:flex-none min-h-11 justify-center">
              <Link to="/professor/atividades/nova">
                <Plus className="h-4 w-4 mr-2" />
                <span>+ Nova</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Filtros - Condicional Mobile/Desktop */}
        {isMobile ? (
          <MobileFilterSheet activeFiltersCount={activeFiltersCount}>
            <FiltersContent />
          </MobileFilterSheet>
        ) : (
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <FiltersContent />
            </CardContent>
          </Card>
        )}

        {/* Legenda de Status e Ações */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-4 w-4" />
              <span className="text-xs">Legenda</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg mt-2 border border-border/50">
              {/* Status de Entregas */}
              <div>
                <h4 className="font-medium text-sm mb-2">Status de Entregas</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-success text-success-foreground flex items-center justify-center text-[10px] font-bold">✓</span>
                    <span className="text-muted-foreground">Aprovadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">⏳</span>
                    <span className="text-muted-foreground">Aguardando análise</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">⏸</span>
                    <span className="text-muted-foreground">Pendentes (não entregues)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] font-bold">!</span>
                    <span className="text-muted-foreground">Atrasadas</span>
                  </div>
                </div>
              </div>
              
              {/* Ações Disponíveis */}
              <div>
                <h4 className="font-medium text-sm mb-2">Ações</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Ver entregas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Editar atividade</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Duplicar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Baixar entregas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span className="text-muted-foreground">Concluir atividade</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Archive className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-muted-foreground">Arquivar</span>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

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
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      {/* Linha 1: Chevron + Nome + Badge de contagem */}
                      <div className="flex items-center gap-2">
                        {openGroups.has(group.classId) ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                        <Users className="h-5 w-5 shrink-0" />
                        <CardTitle className="text-base sm:text-lg truncate">{group.className}</CardTitle>
                        <Badge variant="secondary" className="shrink-0">
                          {group.activities.length}
                        </Badge>
                      </div>

                      {/* Linha 2 no mobile: Chips de status em grid 2x2 */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 sm:gap-2 pl-6 sm:pl-0">
                        {group.counters.pendentes > 0 && (
                          <Badge className={cn(statusColors.pendentes, "text-xs justify-center")}>
                            <span className="sm:hidden">{group.counters.pendentes} Pend.</span>
                            <span className="hidden sm:inline">{group.counters.pendentes} Pendentes</span>
                          </Badge>
                        )}
                        {group.counters.aguardandoAprovacao > 0 && (
                          <Badge className={cn(statusColors.aguardandoAprovacao, "text-xs justify-center")}>
                            <span className="sm:hidden">{group.counters.aguardandoAprovacao} Aguard.</span>
                            <span className="hidden sm:inline">{group.counters.aguardandoAprovacao} Aguardando</span>
                          </Badge>
                        )}
                        {group.counters.aprovadas > 0 && (
                          <Badge className={cn(statusColors.aprovadas, "text-xs justify-center")}>
                            <span className="sm:hidden">{group.counters.aprovadas} Aprov.</span>
                            <span className="hidden sm:inline">{group.counters.aprovadas} Aprovadas</span>
                          </Badge>
                        )}
                        {group.counters.devolvidas > 0 && (
                          <Badge className={cn(statusColors.devolvidas, "text-xs justify-center")}>
                            <span className="sm:hidden">{group.counters.devolvidas} Dev.</span>
                            <span className="hidden sm:inline">{group.counters.devolvidas} Devolvidas</span>
                          </Badge>
                        )}
                        {group.counters.prazoEncerrado > 0 && (
                          <Badge className={cn(statusColors.prazoEncerrado, "text-xs justify-center")}>
                            <span className="sm:hidden">{group.counters.prazoEncerrado} Enc.</span>
                            <span className="hidden sm:inline">{group.counters.prazoEncerrado} Prazo encerrado</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 p-3 sm:p-6 sm:pt-0">
                    <div className="space-y-3">
                      {group.activities.map(activity => {
                        const typeConfig = activityTypeConfig[activity.type as keyof typeof activityTypeConfig];
                        const TypeIcon = typeConfig.icon;
                        const metrics = deliveryMetrics[activity.id];
                        const isOverdue = activity.dueAt && isBefore(new Date(activity.dueAt), startOfDay(new Date()));
                        
                        return (
                          <div
                            key={activity.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-3"
                          >
                            {/* Linha 1 Mobile: Badge + Título */}
                            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0", typeConfig.color)}>
                                <TypeIcon className="h-3 w-3" />
                                <span className="hidden sm:inline">{typeConfig.label}</span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm sm:text-base truncate">{activity.title}</h4>
                                {activity.dueAt && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    <Calendar className="h-3 w-3 shrink-0" />
                                    <span className={cn(isOverdue && "text-destructive font-medium")}>
                                      {formatRelativeDate(activity.dueAt)}
                                    </span>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="hidden sm:inline">{format(new Date(activity.dueAt), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Linha 2 Mobile: Métricas em linha compacta + Ações */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pl-0 sm:pl-4">
                              {/* Métricas compactas no mobile */}
                              <div className="flex gap-3 text-xs sm:text-sm">
                                <span className="text-success" title="Aprovadas">{metrics?.aprovadas || 0}✓</span>
                                <span className="text-primary" title="Aguardando">{metrics?.aguardando || 0}⏳</span>
                                <span className="text-muted-foreground" title="Pendentes">{metrics?.naoEntregue || 0}⏸</span>
                                <span className="text-destructive" title="Atrasadas">{metrics?.atrasadas || 0}!</span>
                              </div>
                              
                              {/* Ações: Menu dropdown no mobile */}
                              <div className="sm:hidden">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover">
                                    <DropdownMenuItem asChild>
                                      <Link to={`/professor/turma/${group.classId}/atividade/${activity.id}`}>
                                        <Eye className="h-4 w-4 mr-2" /> Ver Entregas
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditActivity(activity.id)}>
                                      <Edit className="h-4 w-4 mr-2" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicateActivity(activity.id)}>
                                      <Copy className="h-4 w-4 mr-2" /> Duplicar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadActivity(activity.id)}>
                                      <Download className="h-4 w-4 mr-2" /> Baixar Entregas
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleConcludeActivity(activity.id, activity.title)}
                                      className="text-success focus:text-success"
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteActivity(activity.id, activity.title)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Archive className="h-4 w-4 mr-2" /> Arquivar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              
                              {/* Desktop: Botões inline */}
                              <div className="hidden sm:flex items-center gap-1">
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
                                  onClick={() => handleConcludeActivity(activity.id, activity.title)}
                                  title="Concluir atividade"
                                  className="text-success hover:text-success"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleDeleteActivity(activity.id, activity.title)}
                                  title="Arquivar atividade"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </div>
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

      {/* Modal de confirmação para concluir atividade */}
      <ConfirmDialog
        open={concludeDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConcludeDialog({ isOpen: false, activityId: null, activityTitle: '' });
          }
        }}
        title="Concluir Atividade"
        description={`Tem certeza que deseja concluir "${concludeDialog.activityTitle}"? A atividade sairá do feed ativo e será arquivada automaticamente em 10 dias.`}
        confirmText="Concluir"
        cancelText="Cancelar"
        onConfirm={executeConcludeActivity}
        variant="default"
        isAsync={true}
      />

      {/* Modal de confirmação para excluir atividade */}
      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ isOpen: false, activityId: null, activityTitle: '' });
          }
        }}
        title="Excluir Atividade"
        description={`Tem certeza que deseja excluir "${deleteDialog.activityTitle}"? Esta ação não pode ser desfeita e excluirá todas as entregas dos alunos.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={executeDeleteActivity}
        variant="destructive"
        isAsync={true}
      />
    </div>
  );
}
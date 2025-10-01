import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreInitialization } from '@/hooks/useStoreInitialization';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { isProfessorOfClass } from '@/utils/professor-helpers';
import { getClassDisplayInfo } from '@/utils/class-helpers';
import { usePosts } from '@/hooks/usePosts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  Clock, 
  Plus, 
  FileText, 
  BookOpen,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  FolderOpen,
  ClipboardCheck
} from 'lucide-react';
import { ActivityFilters } from '@/components/activities/ActivityFilters';
import { useActivityFilters } from '@/hooks/useActivityFilters';

export default function ProfessorClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  useStoreInitialization();
  const { getClass } = useClassStore();
  const { getPerson } = usePeopleStore();
  
  if (!user || !id) return null;
  
  // Verificar se o professor tem acesso a esta turma
  if (!isProfessorOfClass(user.id, id)) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-destructive mb-4">Acesso Negado</h1>
        <p className="text-muted-foreground mb-6">
          Você não tem permissão para acessar esta turma.
        </p>
        <Button asChild>
          <Link to="/professor/turmas">Voltar às Minhas Turmas</Link>
        </Button>
      </div>
    );
  }
  
  const schoolClass = getClass(id);
  
  if (!schoolClass) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-destructive mb-4">Turma Não Encontrada</h1>
        <Button asChild>
          <Link to="/professor/turmas">Voltar às Minhas Turmas</Link>
        </Button>
      </div>
    );
  }
  
  const info = getClassDisplayInfo(schoolClass, levels, modalities);
  
  // Buscar atividades desta turma (todos os tipos)
  const allClassActivities = usePosts({ classId: schoolClass.id }).filter(post => 
    ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)
  );
  
  // Use activity filters
  const {
    filteredPosts: classActivities,
    filters,
    setTypeFilter,
    setStatusFilter,
    setDeadlineFilter,
    clearAllFilters
  } = useActivityFilters(allClassActivities);
  
  // Buscar alunos da turma
  const students = schoolClass.students
    .map(studentId => getPerson(studentId))
    .filter(student => student && student.role === 'ALUNO');
  
  // TODO: Implementar métricas reais quando tiver DeliveryStore
  const metrics = {
    pendingDeliveries: 5,
    weeklyDeadlines: 2,
    publishedActivities: allClassActivities.length
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/professor/turmas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold gradient-text">
              {schoolClass.name}
            </h1>
            {schoolClass.year && (
              <Badge variant="secondary">{schoolClass.year}</Badge>
            )}
          </div>
          
          <p className="text-muted-foreground">
            {info.schedule} • {info.levelModality}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button asChild>
            <Link to={`/professor/atividades/nova?turma=${schoolClass.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Link>
          </Button>
          
            <Button variant="outline" asChild>
              <Link to="/professor/calendario">
                <Calendar className="h-4 w-4 mr-2" />
                Ver no Calendário
              </Link>
            </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
          <TabsTrigger value="deliveries">Entregas</TabsTrigger>
          <TabsTrigger value="students">Alunos</TabsTrigger>
        </TabsList>
        
        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics.pendingDeliveries}</p>
                    <p className="text-sm text-muted-foreground">Entregas Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics.weeklyDeadlines}</p>
                    <p className="text-sm text-muted-foreground">Prazos esta Semana</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics.publishedActivities}</p>
                    <p className="text-sm text-muted-foreground">Atividades Publicadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Últimas Publicações</CardTitle>
            </CardHeader>
            <CardContent>
              {classActivities.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhuma atividade publicada ainda
                  </p>
                  <Button asChild>
                  <Link to={`/professor/atividades/nova?turma=${schoolClass.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Atividade
                  </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {allClassActivities.slice(0, 3).map((activity) => {
                    const getIcon = () => {
                      if (activity.type === 'TRABALHO') return FolderOpen;
                      if (activity.type === 'PROVA') return ClipboardCheck;
                      return FileText;
                    };
                    
                    const getColor = () => {
                      if (activity.type === 'TRABALHO') return 'text-orange-600';
                      if (activity.type === 'PROVA') return 'text-red-600';
                      return 'text-blue-600';
                    };
                    
                    const getBgColor = () => {
                      if (activity.type === 'TRABALHO') return 'bg-orange-100 dark:bg-orange-900/20';
                      if (activity.type === 'PROVA') return 'bg-red-100 dark:bg-red-900/20';
                      return 'bg-blue-100 dark:bg-blue-900/20';
                    };
                    
                    const Icon = getIcon();
                    
                    return (
                      <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                        <div className={`p-2 ${getBgColor()} rounded`}>
                          <Icon className={`h-4 w-4 ${getColor()}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{activity.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {activity.body?.substring(0, 100)}...
                          </p>
                          {activity.dueAt && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Prazo: {new Date(activity.dueAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Atividades */}
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <CardTitle>Atividades da Turma ({allClassActivities.length})</CardTitle>
                <Button asChild>
                  <Link to={`/professor/atividades/nova?turma=${schoolClass.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Atividade
                  </Link>
                </Button>
              </div>
              
              {/* Activity Filters */}
              {allClassActivities.length > 0 && (
                <ActivityFilters
                  selectedType={filters.type}
                  selectedStatus={filters.status}
                  selectedDeadline={filters.deadline}
                  onTypeChange={setTypeFilter}
                  onStatusChange={setStatusFilter}
                  onDeadlineChange={setDeadlineFilter}
                  onClearAll={clearAllFilters}
                />
              )}
            </CardHeader>
            <CardContent>
              {allClassActivities.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhuma atividade criada para esta turma
                  </p>
                  <Button asChild>
                    <Link to={`/professor/atividades/nova?turma=${schoolClass.id}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeira Atividade
                    </Link>
                  </Button>
                </div>
              ) : classActivities.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhuma atividade encontrada com os filtros selecionados
                  </p>
                  <Button variant="outline" onClick={clearAllFilters}>
                    Limpar Filtros
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {classActivities.map((activity) => {
                    const getIcon = () => {
                      if (activity.type === 'TRABALHO') return FolderOpen;
                      if (activity.type === 'PROVA') return ClipboardCheck;
                      return FileText;
                    };
                    
                    const getColor = () => {
                      if (activity.type === 'TRABALHO') return 'text-orange-600';
                      if (activity.type === 'PROVA') return 'text-red-600';
                      return 'text-blue-600';
                    };
                    
                    const getBadgeColor = () => {
                      if (activity.type === 'TRABALHO') return 'bg-orange-500';
                      if (activity.type === 'PROVA') return 'bg-red-500';
                      return 'bg-blue-500';
                    };
                    
                    const Icon = getIcon();
                    
                    return (
                      <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className={`p-2 ${activity.type === 'TRABALHO' ? 'bg-orange-100 dark:bg-orange-900/20' : activity.type === 'PROVA' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'} rounded`}>
                          <Icon className={`h-4 w-4 ${getColor()}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{activity.title}</h4>
                            <Badge className={`${getBadgeColor()} text-white`}>
                              {activity.type}
                            </Badge>
                            {activity.activityMeta?.peso !== null && activity.activityMeta?.peso !== undefined && activity.activityMeta?.usePeso !== false && (
                              <Badge variant="outline" className="text-xs">
                                Peso: {activity.activityMeta.peso}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {activity.dueAt ? 
                              `Prazo: ${new Date(activity.dueAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}` :
                              'Sem prazo definido'
                            }
                          </p>
                          {activity.body && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {activity.body}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={activity.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                            {activity.status === 'PUBLISHED' ? 'Publicado' : 'Agendado'}
                          </Badge>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/professor/turma/${schoolClass.id}/atividade/${activity.id}?tab=entregas`}>
                              Ver Entregas
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Entregas */}
        <TabsContent value="deliveries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Entregas por Atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Sistema de entregas em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Alunos */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Alunos da Turma ({students.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum aluno matriculado nesta turma
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((student) => (
                    <div key={student.id} className="p-4 rounded-lg border">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{student.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {student.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                      
                      {student.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Mail className="h-3 w-3" />
                          <span>{student.email}</span>
                        </div>
                      )}
                      
                      {student.student?.phones && student.student.phones.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{student.student.phones[0]}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
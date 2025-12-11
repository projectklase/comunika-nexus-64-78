import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { useStoreInitialization } from '@/hooks/useStoreInitialization';
import { getProfessorClasses } from '@/utils/professor-helpers';
import { DashboardCard } from '@/components/Dashboard/DashboardCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, BookOpen, Clock, Plus, BarChart3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { orderClassesBySchedule, getClassDisplayInfo } from '@/utils/class-helpers';
import { useLevels } from '@/hooks/useLevels';
import { useModalities } from '@/hooks/useModalities';
import { usePosts } from '@/hooks/usePosts';
import { useState, useEffect, useMemo } from 'react';
import { deliveryStore } from '@/stores/delivery-store';

export default function ProfessorDashboard() {
  const { user, isLoading } = useAuth();
  const { currentSchool } = useSchool();
  const navigate = useNavigate();
  useStoreInitialization();
  const { levels } = useLevels();
  const { modalities } = useModalities();
  const { posts, isLoading: postsLoading } = usePosts({
    status: 'PUBLISHED'
  });
  
  const [deliveryMetrics, setDeliveryMetrics] = useState({
    pendingDeliveries: 0,
    weeklyDeadlines: 0
  });

  // ✅ Memoizar professorClasses para evitar loop infinito
  const professorClasses = useMemo(() => {
    if (!user?.id || !currentSchool?.id) return [];
    return getProfessorClasses(user.id, currentSchool.id);
  }, [user?.id, currentSchool?.id]);

  // ✅ Criar string de IDs para dependência primitiva (evita re-renders)
  const classIdsString = useMemo(() => 
    professorClasses.map(c => c.id).join(','),
    [professorClasses]
  );

  const orderedClasses = useMemo(() => 
    orderClassesBySchedule(professorClasses),
    [professorClasses]
  );
  
  const recentActivities = useMemo(() => {
    if (!user?.id) return [];
    return posts
      .filter(p => p.authorId === user.id && ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(p.type))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [posts, user?.id]);
  
  const totalStudents = useMemo(() => 
    professorClasses.reduce((sum, c) => sum + (c.students?.length || 0), 0),
    [professorClasses]
  );

  // ✅ useEffect ANTES dos retornos condicionais, com dependências primitivas
  useEffect(() => {
    async function fetchDeliveryMetrics() {
      if (!currentSchool?.id || !classIdsString) {
        setDeliveryMetrics({ pendingDeliveries: 0, weeklyDeadlines: 0 });
        return;
      }

      const classIds = classIdsString.split(',').filter(Boolean);
      if (classIds.length === 0) {
        setDeliveryMetrics({ pendingDeliveries: 0, weeklyDeadlines: 0 });
        return;
      }
      
      console.log('🔵 [ProfessorDashboard] Buscando métricas para school_id:', currentSchool.id);
      const metrics = await deliveryStore.getProfessorMetrics(classIds, currentSchool.id);
      setDeliveryMetrics(metrics);
    }
    
    fetchDeliveryMetrics();
  }, [classIdsString, currentSchool?.id]);
  
  // ✅ Retornos condicionais DEPOIS de todos os hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card p-8 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    navigate('/login');
    return null;
  }
  
  if (user.role !== 'professor') {
    navigate('/dashboard');
    return null;
  }
  
  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
            Bem-vindo, {user.name}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie suas turmas e atividades
          </p>
        </div>
        
        <Button
          onClick={() => navigate('/professor/atividades/nova')}
          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 min-h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <DashboardCard
          title="Minhas Turmas"
          value={professorClasses.length}
          description="turmas ativas"
          trend={{ value: 0, label: "+0%" }}
          icon={Users}
        />
        
        <DashboardCard
          title="Total de Alunos"
          value={totalStudents}
          description="em todas as turmas"
          trend={{ value: 0, label: "+0%" }}
          icon={BookOpen}
        />
        
        <DashboardCard
          title="Entregas Pendentes"
          value={deliveryMetrics.pendingDeliveries}
          description="aguardando correção"
          trend={{ value: 0, label: "+0%" }}
          icon={Clock}
        />
        
        <DashboardCard
          title="Prazos esta Semana"
          value={deliveryMetrics.weeklyDeadlines}
          description="atividades com prazo"
          trend={{ value: 0, label: "+0%" }}
          icon={Calendar}
        />
      </div>

      {/* Turmas Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-white/10 hover:border-white/15 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Minhas Turmas
            </CardTitle>
            <Button variant="outline" size="sm" className="bg-white/5 backdrop-blur-sm border-white/20 hover:bg-white/10 hover:border-white/30 transition-all" asChild>
              <Link to="/professor/turmas">Ver Todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {orderedClasses.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma turma atribuída
                </p>
                <p className="text-sm text-muted-foreground">
                  Entre em contato com a secretaria para ter turmas atribuídas
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orderedClasses.slice(0, 5).map((schoolClass) => {
                  const info = getClassDisplayInfo(schoolClass, levels, modalities);
                  return (
                    <div key={schoolClass.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/8 hover:border-white/10 transition-all duration-200">
                      <div>
                        <h4 className="font-medium">{schoolClass.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {info.schedule} • {schoolClass.students.length} alunos
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/professor/turma/${schoolClass.id}`}>
                          Abrir
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atividades Recentes */}
        <Card className="bg-card/50 backdrop-blur-sm border-white/10 hover:border-white/15 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Atividades Recentes
            </CardTitle>
            <Button variant="outline" size="sm" className="bg-white/5 backdrop-blur-sm border-white/20 hover:bg-white/10 hover:border-white/30 transition-all" asChild>
              <Link to="/professor/atividades">Ver Todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Carregando...</p>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-6">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma atividade recente
                </p>
                <Button asChild>
                  <Link to="/professor/atividades/nova">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Atividade
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/8 hover:border-white/10 transition-all duration-200">
                    <div className="flex-1">
                      <h4 className="font-medium">{activity.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {activity.type} • {new Date(activity.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/professor/turma/${activity.classIds?.[0] || activity.classId}/atividade/${activity.id}`}>
                        Ver
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="w-full sm:max-w-fit sm:mx-auto bg-card/50 backdrop-blur-sm border-white/10">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3 items-center justify-center">
            <Button variant="outline" className="h-16 w-full sm:h-20 sm:w-28 flex-col gap-1.5 sm:gap-2 rounded-xl bg-white/5 backdrop-blur-sm border-white/15 hover:bg-white/10 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group" asChild>
              <Link to="/professor/turmas">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] sm:text-xs text-center">Turmas</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-16 w-full sm:h-20 sm:w-28 flex-col gap-1.5 sm:gap-2 rounded-xl bg-white/5 backdrop-blur-sm border-white/15 hover:bg-white/10 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group" asChild>
              <Link to="/professor/calendario">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] sm:text-xs text-center">Calendário</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-16 w-full sm:h-20 sm:w-28 flex-col gap-1.5 sm:gap-2 rounded-xl bg-white/5 backdrop-blur-sm border-white/15 hover:bg-white/10 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group" asChild>
              <Link to="/professor/atividades/nova">
                <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] sm:text-xs text-center">Atividade</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useAuth } from '@/contexts/AuthContext';
import { useStoreInitialization } from '@/hooks/useStoreInitialization';
import { getProfessorClasses, getProfessorMetrics } from '@/utils/professor-helpers';
import { DashboardCard } from '@/components/Dashboard/DashboardCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, BookOpen, Clock, Plus, BarChart3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { orderClassesBySchedule, getClassDisplayInfo } from '@/utils/class-helpers';

export default function ProfessorDashboard() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  useStoreInitialization();
  
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
  
  const professorClasses = getProfessorClasses(user.id);
  const orderedClasses = orderClassesBySchedule(professorClasses);
  const metrics = getProfessorMetrics(user.id);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">
            Bem-vindo, {user.name}
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas turmas e atividades
          </p>
        </div>
        
        <div className="flex gap-2">
            <Button
              onClick={() => navigate('/professor/atividades/nova')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Minhas Turmas"
          value={metrics.totalClasses}
          description="turmas ativas"
          trend={{ value: 0, label: "+0%" }}
          icon={Users}
        />
        
        <DashboardCard
          title="Total de Alunos"
          value={metrics.totalStudents}
          description="em todas as turmas"
          trend={{ value: 0, label: "+0%" }}
          icon={BookOpen}
        />
        
        <DashboardCard
          title="Entregas Pendentes"
          value={metrics.pendingDeliveries}
          description="aguardando correção"
          trend={{ value: 0, label: "+0%" }}
          icon={Clock}
        />
        
        <DashboardCard
          title="Prazos esta Semana"
          value={metrics.weeklyDeadlines}
          description="atividades com prazo"
          trend={{ value: 0, label: "+0%" }}
          icon={Calendar}
        />
      </div>

      {/* Turmas Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Minhas Turmas
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
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
                  const info = getClassDisplayInfo(schoolClass);
                  return (
                    <div key={schoolClass.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Atividades Recentes
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/professor/atividades">Ver Todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link to="/professor/turmas">
                <Users className="h-6 w-6" />
                <span>Minhas Turmas</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link to="/professor/calendario">
                <Calendar className="h-6 w-6" />
                <span>Calendário</span>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <Link to="/professor/atividades/nova">
                <Plus className="h-6 w-6" />
                <span>Nova Atividade</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
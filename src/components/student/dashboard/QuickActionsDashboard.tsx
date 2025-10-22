import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Calendar, 
  Rss, 
  BookOpen, 
  Settings, 
  Target, 
  Clock,
  TrendingUp,
  Users,
  Bell
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useStudentPosts } from '@/hooks/useStudentPosts';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentClasses } from '@/utils/student-helpers';
import { cn } from '@/lib/utils';

interface QuickActionsDashboardProps {
  onClearPreferences?: () => void;
}

export function QuickActionsDashboard({ onClearPreferences }: QuickActionsDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activitiesCount, eventsCount, noticesCount } = useStudentPosts();

  const studentClasses = user ? getStudentClasses(user.id) : [];

  const quickActions = [
    {
      title: 'Minhas Atividades',
      description: 'Tarefas, trabalhos e provas',
      icon: BookOpen,
      path: ROUTES.ALUNO.FEED + '?type=ATIVIDADE,TRABALHO,PROVA',
      badge: activitiesCount,
      color: 'primary'
    },
    {
      title: 'Calendário',
      description: 'Visualização completa dos eventos',
      icon: Calendar,
      path: ROUTES.ALUNO.CALENDARIO,
      badge: eventsCount,
      color: 'secondary'
    },
    {
      title: 'Meu Feed',
      description: 'Todas as comunicações',
      icon: Rss,
      path: ROUTES.ALUNO.FEED,
      badge: noticesCount,
      color: 'info'
    },
    {
      title: 'NEXUS Planner',
      description: 'Planejamento inteligente',
      icon: Target,
      path: ROUTES.ALUNO.NEXUS,
      badge: null,
      color: 'accent'
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return 'border-primary/30 hover:border-primary/50 hover:bg-primary/5 text-primary';
      case 'secondary':
        return 'border-secondary/30 hover:border-secondary/50 hover:bg-secondary/5 text-secondary';
      case 'info':
        return 'border-info/30 hover:border-info/50 hover:bg-info/5 text-info';
      case 'accent':
        return 'border-accent/30 hover:border-accent/50 hover:bg-accent/5 text-accent';
      default:
        return 'border-border hover:border-primary/30 hover:bg-muted/50';
    }
  };

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Ações Rápidas
        </CardTitle>
        <CardDescription>
          Acesso direto às suas funcionalidades mais usadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <TooltipProvider key={action.title}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200",
                      "glass-subtle hover:shadow-md",
                      getColorClasses(action.color)
                    )}
                    onClick={() => navigate(action.path)}
                  >
                    <div className="relative">
                      <action.icon className="h-6 w-6" />
                      {action.badge && action.badge > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                          {action.badge > 99 ? '99+' : action.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">
                        {action.description}
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Secondary Actions */}
        <div className="border-t border-border/50 pt-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Preferências</span>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start h-8 text-xs"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-3 w-3 mr-2" />
              Configurações da conta
            </Button>
            
            {onClearPreferences && (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start h-8 text-xs text-muted-foreground"
                onClick={onClearPreferences}
              >
                <Clock className="h-3 w-3 mr-2" />
                Limpar filtros salvos
              </Button>
            )}
          </div>
        </div>

        {/* Student Stats */}
        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Minhas turmas</span>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {studentClasses.length === 0 
              ? 'Nenhuma turma encontrada' 
              : `${studentClasses.length} ${studentClasses.length === 1 ? 'turma' : 'turmas'} ativas`
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
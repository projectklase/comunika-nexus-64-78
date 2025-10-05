import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle2, Clock, Target } from 'lucide-react';
import { Post } from '@/types/post';
import { useAuth } from '@/contexts/AuthContext';
import { deliveryStore } from '@/stores/delivery-store';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

interface ProgressStripDashboardProps {
  posts: Post[];
}

export function ProgressStripDashboard({ posts }: ProgressStripDashboardProps) {
  const { user } = useAuth();
  // deliveryStore is imported directly

  const monthlyProgress = useMemo(() => {
    if (!user) return { delivered: 0, total: 0, percentage: 0 };

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Get activities from this month
    const monthlyActivities = posts.filter(post => {
      if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return false;
      if (!post.dueAt) return false;
      
      const dueDate = new Date(post.dueAt);
      return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
    });

    const total = monthlyActivities.length;
    // Calculate delivered count asynchronously
    let delivered = 0;
    const checkDeliveries = async () => {
      for (const post of monthlyActivities) {
        const del = await deliveryStore.getByStudentAndPost(user.id, post.id);
        if (del) delivered++;
      }
    };
    checkDeliveries();

    const percentage = total > 0 ? Math.round((delivered / total) * 100) : 0;

    return { delivered, total, percentage };
  }, [posts, user, deliveryStore]);

  const weeklyProgress = useMemo(() => {
    if (!user) return { completed: 0, pending: 0 };

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentActivities = posts.filter(post => {
      if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return false;
      if (!post.dueAt) return false;
      
      const dueDate = new Date(post.dueAt);
      return isWithinInterval(dueDate, { start: oneWeekAgo, end: now });
    });

    // Calculate completed count asynchronously
    let completed = 0;
    const checkCompleted = async () => {
      for (const post of recentActivities) {
        const del = await deliveryStore.getByStudentAndPost(user.id, post.id);
        if (del) completed++;
      }
    };
    checkCompleted();

    const pending = recentActivities.length - completed;

    return { completed, pending };
  }, [posts, user, deliveryStore]);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressVariant = (percentage: number) => {
    if (percentage >= 80) return 'default'; // Uses primary color
    if (percentage >= 60) return 'warning';
    return 'destructive';
  };

  if (monthlyProgress.total === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Progresso do Mês
          </CardTitle>
          <CardDescription>
            Acompanhe suas entregas de {format(new Date(), 'MMMM')}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4">
          <div className="text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma atividade neste mês</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Progresso do Mês
        </CardTitle>
        <CardDescription>
          Suas entregas de {format(new Date(), 'MMMM yyyy')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Atividades entregues</span>
            <span className={`font-medium ${getProgressColor(monthlyProgress.percentage)}`}>
              {monthlyProgress.delivered}/{monthlyProgress.total}
            </span>
          </div>
          
          <Progress 
            value={monthlyProgress.percentage} 
            className="h-2"
          />
          
          <div className="flex items-center justify-between">
            <Badge 
              variant="outline" 
              className={`text-xs ${getProgressColor(monthlyProgress.percentage)}`}
            >
              {monthlyProgress.percentage}% completo
            </Badge>
            
            {monthlyProgress.percentage === 100 && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                100% 🎉
              </Badge>
            )}
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Últimos 7 dias</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/20">
              <div className="text-lg font-semibold text-success">
                {weeklyProgress.completed}
              </div>
              <div className="text-xs text-muted-foreground">Entregues</div>
            </div>
            
            <div className="text-center p-2 rounded-lg bg-muted/20">
              <div className="text-lg font-semibold text-warning">
                {weeklyProgress.pending}
              </div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        {monthlyProgress.percentage < 100 && (
          <div className="text-center text-xs text-muted-foreground bg-muted/10 p-2 rounded-lg">
            {monthlyProgress.percentage >= 80 
              ? "Você está quase lá! Continue assim! 💪"
              : monthlyProgress.percentage >= 60
              ? "Bom progresso! Foque nas próximas entregas 📚"
              : "Vamos acelerar? Organize suas prioridades! ⚡"
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}
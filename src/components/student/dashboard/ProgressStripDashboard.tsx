import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle2, Clock, Target, Zap, Flame } from 'lucide-react';
import { Post } from '@/types/post';
import { useAuth } from '@/contexts/AuthContext';
import { deliveryStore } from '@/stores/delivery-store';
import { useStudentGamification } from '@/stores/studentGamification';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

interface ProgressStripDashboardProps {
  posts: Post[];
}

export function ProgressStripDashboard({ posts }: ProgressStripDashboardProps) {
  const { user } = useAuth();
  const { xp, streak } = useStudentGamification();
  
  const [monthlyProgress, setMonthlyProgress] = useState({ delivered: 0, total: 0, percentage: 0 });
  const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, pending: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchProgress = async () => {
      setIsLoading(true);
      
      try {
        // Fetch all student deliveries once (efficient)
        const allDeliveries = await deliveryStore.list({ studentId: user.id });
        
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Filter monthly activities
        const monthlyActivities = posts.filter(post => {
          if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return false;
          if (!post.dueAt) return false;
          
          const dueDate = new Date(post.dueAt);
          return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
        });

        // Filter weekly activities
        const weeklyActivities = posts.filter(post => {
          if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return false;
          if (!post.dueAt) return false;
          
          const dueDate = new Date(post.dueAt);
          return isWithinInterval(dueDate, { start: oneWeekAgo, end: now });
        });

        // Calculate monthly delivered count
        const deliveredMonthly = monthlyActivities.filter(post =>
          allDeliveries.some(delivery => delivery.postId === post.id)
        ).length;

        const totalMonthly = monthlyActivities.length;
        const percentageMonthly = totalMonthly > 0 ? Math.round((deliveredMonthly / totalMonthly) * 100) : 0;

        // Calculate weekly completed count
        const completedWeekly = weeklyActivities.filter(post =>
          allDeliveries.some(delivery => delivery.postId === post.id)
        ).length;

        const pendingWeekly = weeklyActivities.length - completedWeekly;

        setMonthlyProgress({
          delivered: deliveredMonthly,
          total: totalMonthly,
          percentage: percentageMonthly
        });

        setWeeklyProgress({
          completed: completedWeekly,
          pending: pendingWeekly
        });
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [posts, user?.id]);

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

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Progresso do Mês
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Acompanhe suas entregas de {format(new Date(), 'MMMM yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4 px-4 sm:px-6">
          <div className="text-center text-muted-foreground">
            <div className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs sm:text-sm">Carregando progresso...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (monthlyProgress.total === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Progresso do Mês
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Acompanhe suas entregas de {format(new Date(), 'MMMM yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4 px-4 sm:px-6">
          <div className="text-center text-muted-foreground">
            <Target className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm">Nenhuma atividade neste mês</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Progresso do Mês
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Suas entregas de {format(new Date(), 'MMMM yyyy')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
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
        <div className="border-t border-border/50 pt-3 sm:pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">Últimos 7 dias</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/20">
              <div className="text-base sm:text-lg font-semibold text-success">
                {weeklyProgress.completed}
              </div>
              <div className="text-xs text-muted-foreground">Entregues</div>
            </div>
            
            <div className="text-center p-2 rounded-lg bg-muted/20">
              <div className="text-base sm:text-lg font-semibold text-warning">
                {weeklyProgress.pending}
              </div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
          </div>
        </div>

        {/* XP and Streak Section */}
        <div className="border-t border-border/50 pt-3 sm:pt-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">XP Total</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-primary">
                {xp}
              </div>
            </div>
            
            <div className="text-center p-2 sm:p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                <span className="text-xs font-medium text-muted-foreground">Sequência</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-orange-500">
                {streak} {streak === 1 ? 'dia' : 'dias'}
              </div>
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
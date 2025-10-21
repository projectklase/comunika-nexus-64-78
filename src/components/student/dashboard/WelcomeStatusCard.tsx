import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Post } from '@/types/post';
import { isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface WelcomeStatusCardProps {
  posts: Post[];
}

type StatusData = {
  status: 'em-dia' | 'pendente' | 'urgente';
  message: string;
  variant: 'default' | 'warning' | 'destructive';
  icon: React.ReactNode;
  count?: number;
};

export function WelcomeStatusCard({ posts }: WelcomeStatusCardProps) {
  const { user } = useAuth();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const statusData: StatusData = useMemo(() => {
    // Check if there are activities due today
    const todayActivities = posts.filter(post => {
      const dateToCheck = post.dueAt || post.eventStartAt;
      if (!dateToCheck) return false;
      if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return false;
      return isToday(new Date(dateToCheck));
    });

    // Check upcoming activities (next 2 days)
    const now = new Date();
    const upcomingActivities = posts.filter(post => {
      const dateToCheck = post.dueAt || post.eventStartAt;
      if (!dateToCheck) return false;
      if (!['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type)) return false;
      
      const postDate = new Date(dateToCheck);
      const diffInDays = Math.ceil((postDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffInDays > 0 && diffInDays <= 2;
    });

    // Determine status
    if (todayActivities.length > 0) {
      const hasProva = todayActivities.some(p => p.type === 'PROVA');
      if (hasProva) {
        return {
          status: 'urgente',
          message: `ATENÇÃO: Prova hoje!`,
          variant: 'destructive',
          icon: <AlertCircle className="h-5 w-5" />,
          count: todayActivities.length
        };
      }
      return {
        status: 'urgente',
        message: `${todayActivities.length} ${todayActivities.length === 1 ? 'atividade para hoje' : 'atividades para hoje'}`,
        variant: 'warning',
        icon: <Clock className="h-5 w-5" />,
        count: todayActivities.length
      };
    }

    if (upcomingActivities.length > 0) {
      return {
        status: 'pendente',
        message: `${upcomingActivities.length} ${upcomingActivities.length === 1 ? 'atividade próxima' : 'atividades próximas'}`,
        variant: 'warning',
        icon: <Clock className="h-5 w-5" />,
        count: upcomingActivities.length
      };
    }

    return {
      status: 'em-dia',
      message: 'Você está em dia!',
      variant: 'default',
      icon: <CheckCircle2 className="h-5 w-5" />
    };
  }, [posts]);

  const getStatusStyles = (variant: string) => {
    switch (variant) {
      case 'destructive':
        return {
          card: 'border-destructive/30 bg-destructive/5',
          badge: 'bg-destructive/20 text-destructive border-destructive/30',
          glow: 'shadow-destructive/20'
        };
      case 'warning':
        return {
          card: 'border-warning/30 bg-warning/5',
          badge: 'bg-warning/20 text-warning border-warning/30',
          glow: 'shadow-warning/20'
        };
      default:
        return {
          card: 'border-primary/30 bg-primary/5',
          badge: 'bg-primary/20 text-primary border-primary/30',
          glow: 'shadow-primary/20'
        };
    }
  };

  const styles = getStatusStyles(statusData.variant);

  return (
    <Card className={cn(
      "glass-card border transition-all duration-300",
      styles.card,
      "hover:shadow-lg",
      styles.glow
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                {greeting}, {user?.name?.split(' ')[0]}!
              </h2>
              {statusData.status === 'em-dia' && (
                <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-3">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border",
                styles.badge
              )}>
                {statusData.icon}
              </div>
              
              <div>
                <p className="text-sm font-medium text-foreground">
                  {statusData.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {statusData.count && statusData.count > 0 && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-lg font-bold h-12 w-12 rounded-full flex items-center justify-center",
                styles.badge
              )}
            >
              {statusData.count}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
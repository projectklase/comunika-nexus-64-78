import { useMemo } from 'react';
import { parseISO, isWithinInterval, startOfDay, endOfDay, addDays } from 'date-fns';
import { Clock, Calendar, Eye, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePosts } from '@/hooks/usePosts';
import { usePostActionsUnified } from '@/hooks/usePostActionsUnified';
import { useStudentPlannerStore } from '@/stores/studentPlannerStore';
import { Post } from '@/types/post';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export function RadarSection() {
  const allPosts = usePosts({ status: 'PUBLISHED' });
  const { openInCalendar } = usePostActionsUnified();
  const { addBlock, suggestTimeSlots } = useStudentPlannerStore();

  // Filter activities only
  const activities = useMemo(() => {
    return allPosts.filter(post => 
      ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type) && 
      post.dueAt
    );
  }, [allPosts]);

  // Categorize activities by urgency
  const categorizedActivities = useMemo(() => {
    const now = new Date();
    const in48Hours = addDays(now, 2);
    const thisWeek = addDays(now, 7);

    const overdue = activities.filter(activity => {
      const dueDate = parseISO(activity.dueAt!);
      return dueDate < startOfDay(now);
    });

    const next48h = activities.filter(activity => {
      const dueDate = parseISO(activity.dueAt!);
      return isWithinInterval(dueDate, { start: now, end: in48Hours }) && dueDate >= startOfDay(now);
    });

    const thisWeekActivities = activities.filter(activity => {
      const dueDate = parseISO(activity.dueAt!);
      return isWithinInterval(dueDate, { start: in48Hours, end: thisWeek });
    });

    return {
      overdue: overdue.slice(0, 5),
      next48h: next48h.slice(0, 5),
      thisWeek: thisWeekActivities.slice(0, 5)
    };
  }, [activities]);

  const handleMarkDelivered = (post: Post) => {
    // Mock implementation - in real app, this would update the post status
    toast({
      title: 'Atividade marcada como entregue',
      description: `"${post.title}" foi marcada como concluída`
    });
  };

  const handleScheduleInPlanner = (post: Post) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const suggestions = suggestTimeSlots(tomorrowStr, 60);
    if (suggestions.length > 0) {
      const firstSlot = suggestions[0];
      addBlock({
        postId: post.id,
        date: tomorrowStr,
        startTime: firstSlot.startTime,
        endTime: firstSlot.endTime,
        turmaId: post.classId || post.classIds?.[0],
        type: 'study'
      });
      
      toast({
        title: 'Agendado no Planner',
        description: `"${post.title}" foi agendado para ${firstSlot.startTime} de amanhã`
      });
    } else {
      toast({
        title: 'Nenhum horário disponível',
        description: 'Não foi possível encontrar um horário livre amanhã',
        variant: 'destructive'
      });
    }
  };

  const handleViewInCalendar = (post: Post) => {
    try {
      openInCalendar(post);
    } catch (error) {
      console.error('Error navigating to calendar from radar:', error);
      toast({
        title: "Erro na navegação",
        description: "Não foi possível abrir o calendário.",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (post: Post) => {
    // Mock implementation - would open details modal/drawer
    toast({
      title: 'Detalhes da atividade',
      description: `Abrindo detalhes de "${post.title}"`
    });
  };

  const renderActivityCard = (activity: Post, urgencyLevel: 'critical' | 'high' | 'medium') => {
    const urgencyColors = {
      critical: 'border-red-500/30 bg-red-500/5',
      high: 'border-orange-500/30 bg-orange-500/5',
      medium: 'border-yellow-500/30 bg-yellow-500/5'
    };

    const urgencyBadges = {
      critical: { variant: 'destructive' as const, label: 'Crítico' },
      high: { variant: 'destructive' as const, label: 'Urgente' },
      medium: { variant: 'secondary' as const, label: 'Importante' }
    };

    return (
      <Card 
        key={activity.id} 
        className={cn("glass-card border", urgencyColors[urgencyLevel])}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">
                {activity.title}
              </h4>
              {activity.classIds?.[0] && (
                <p className="text-xs text-muted-foreground">
                  Turma: {activity.classIds[0]}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={urgencyBadges[urgencyLevel].variant} className="text-xs">
                {urgencyBadges[urgencyLevel].label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {activity.type}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {activity.dueAt && new Date(activity.dueAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkDelivered(activity)}
              className="h-7 px-2 text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Marcar entregue
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleScheduleInPlanner(activity)}
              className="h-7 px-2 text-xs"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Agendar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleViewInCalendar(activity)}
              className="h-7 px-2 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver calendário
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleViewDetails(activity)}
              className="h-7 px-2 text-xs"
            >
              Detalhes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overdue Activities */}
      <section>
        <Card className="glass-card border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Atrasadas ({categorizedActivities.overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorizedActivities.overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                🎉 Nenhuma atividade atrasada!
              </p>
            ) : (
              categorizedActivities.overdue.map(activity => 
                renderActivityCard(activity, 'critical')
              )
            )}
          </CardContent>
        </Card>
      </section>

      {/* Next 48h */}
      <section>
        <Card className="glass-card border-orange-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-400">
              <Clock className="h-5 w-5" />
              Vencem em 48h ({categorizedActivities.next48h.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorizedActivities.next48h.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nada urgente nos próximos 2 dias ✨
              </p>
            ) : (
              categorizedActivities.next48h.map(activity => 
                renderActivityCard(activity, 'high')
              )
            )}
          </CardContent>
        </Card>
      </section>

      {/* This Week */}
      <section>
        <Card className="glass-card border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <Calendar className="h-5 w-5" />
              Esta Semana ({categorizedActivities.thisWeek.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorizedActivities.thisWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Semana tranquila pela frente 😌
              </p>
            ) : (
              categorizedActivities.thisWeek.map(activity => 
                renderActivityCard(activity, 'medium')
              )
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
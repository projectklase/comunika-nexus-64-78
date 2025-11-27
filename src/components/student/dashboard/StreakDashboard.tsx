import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Calendar, Gift, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentGamification } from '@/stores/studentGamification';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function StreakDashboard() {
  const { 
    streak, 
    xp, 
    checkIn, 
    resetIfNeeded,
    week,
    syncToDatabase
  } = useStudentGamification();
  const { toast } = useToast();

  // Reset data if needed on component mount
  useEffect(() => {
    resetIfNeeded();
  }, [resetIfNeeded]);

  const handleCheckIn = async () => {
    const result = checkIn();
    
    if (result.success) {
      // Sync to database
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await syncToDatabase(user.id);
      }

      if (result.xpGained > 0) {
        toast({
          title: `Check-in realizado! +${result.xpGained} XP`,
          description: `Streak: ${result.streakCount} dias 🔥`,
          duration: 3000
        });
      } else {
        toast({
          title: "Check-in mantido com perdão",
          description: `Streak preservado: ${result.streakCount} dias`,
          duration: 3000
        });
      }
    } else {
      toast({
        title: "Check-in já realizado hoje",
        description: "Volte amanhã para manter seu streak!",
        variant: "default",
        duration: 2000
      });
    }
  };

  const getStreakColor = (days: number) => {
    if (days >= 30) return 'text-purple-500';
    if (days >= 14) return 'text-yellow-500';
    if (days >= 7) return 'text-orange-500';
    if (days >= 3) return 'text-red-500';
    return 'text-primary';
  };

  const getStreakBadge = (days: number) => {
    if (days >= 30) return { label: 'Lendário', icon: '👑', color: 'purple' };
    if (days >= 14) return { label: 'Dedicado', icon: '⭐', color: 'yellow' };
    if (days >= 7) return { label: 'Consistente', icon: '🔥', color: 'orange' };
    if (days >= 3) return { label: 'Motivado', icon: '💪', color: 'red' };
    return { label: 'Iniciante', icon: '🌟', color: 'blue' };
  };

  // Calculate only last 7 days for week progress
  const getWeekDates = () => {
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const weekProgress = weekDates.filter(date => week[date]).length;
  const today = new Date().toISOString().split('T')[0];
  const hasCheckedInToday = week[today];

  const streakBadge = getStreakBadge(streak);

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Flame className={cn("h-5 w-5", getStreakColor(streak))} />
          Streak Diário
        </CardTitle>
        <CardDescription>
          Mantenha sua consistência de estudos
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Streak Display */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold">
              {streak}
            </span>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">dias</div>
              <Flame className={cn("h-6 w-6 mx-auto", getStreakColor(streak))} />
            </div>
          </div>
          
          <Badge 
            variant="outline"
            className={cn(
              "text-xs",
              streakBadge.color === 'purple' && "border-purple-500/30 text-purple-500 bg-purple-500/10",
              streakBadge.color === 'yellow' && "border-yellow-500/30 text-yellow-500 bg-yellow-500/10",
              streakBadge.color === 'orange' && "border-orange-500/30 text-orange-500 bg-orange-500/10",
              streakBadge.color === 'red' && "border-red-500/30 text-red-500 bg-red-500/10",
              streakBadge.color === 'blue' && "border-blue-500/30 text-blue-500 bg-blue-500/10"
            )}
          >
            {streakBadge.icon} {streakBadge.label}
          </Badge>
        </div>

        {/* Check-in Button */}
        <Button
          onClick={handleCheckIn}
          disabled={hasCheckedInToday}
          className={cn(
            "w-full transition-all duration-200",
            hasCheckedInToday 
              ? "bg-success/20 text-success border-success/30 cursor-not-allowed"
              : "bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
          )}
          variant={hasCheckedInToday ? "outline" : "default"}
        >
          {hasCheckedInToday ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Check-in feito hoje!
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Fazer check-in diário
            </>
          )}
        </Button>

        {/* Weekly Progress */}
        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Progresso semanal</span>
            <span className="text-sm font-medium">{weekProgress}/7</span>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((date, index) => {
              const dayLabels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
              const dayOfWeek = new Date(date).getDay();
              const isComplete = week[date];
              
              return (
                <div
                  key={date}
                  className={cn(
                    "aspect-square flex items-center justify-center text-xs rounded border",
                    isComplete
                      ? "bg-primary/20 border-primary/30 text-primary"
                      : "bg-muted/20 border-border text-muted-foreground"
                  )}
                >
                  {dayLabels[dayOfWeek]}
                </div>
              );
            })}
          </div>
        </div>

        {/* XP Display */}
        <div className="text-center text-xs text-muted-foreground">
          <Gift className="h-4 w-4 inline mr-1" />
          Total: {xp} XP acumulados
        </div>
      </CardContent>
    </Card>
  );
}
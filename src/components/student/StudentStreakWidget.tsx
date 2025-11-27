import { useState, useEffect } from 'react';
import { Flame, Gift, CheckCircle2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStudentGamification } from '@/stores/studentGamification';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const getToday = () => new Date().toISOString().split('T')[0];
const diffDays = (date1: string, date2: string) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
};

const getWeekDates = () => {
  const today = new Date();
  const weekDates = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    weekDates.push(date.toISOString().split('T')[0]);
  }
  
  return weekDates;
};


export function StudentStreakWidget() {
  const { user } = useAuth();
  const {
    streak,
    xp,
    lastCheckIn,
    forgiveness,
    week,
    checkIn,
    useForgiveness,
    resetIfNeeded,
    syncToDatabase
  } = useStudentGamification();

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    resetIfNeeded();
  }, [resetIfNeeded]);

  // Verificação de role: widget só deve renderizar para alunos
  if (!user || user.role !== 'aluno') {
    console.warn('[StudentStreakWidget] Bloqueado: usuário não é aluno', {
      userId: user?.id,
      role: user?.role
    });
    return null;
  }

  const today = getToday();
  const gap = lastCheckIn ? diffDays(today, lastCheckIn) : 999;
  const canCheckIn = gap > 0;
  const canUseForgiveness = gap === 2 && forgiveness.available;
  const weekDates = getWeekDates();

  const handleCheckIn = async () => {
    const result = checkIn();
    
    if (result.success) {
      // Sync to database
      if (user?.id) {
        await syncToDatabase(user.id);
      }

      toast({
        title: `+${result.xpGained} XP! 🎉`,
        description: `Streak: ${result.streakCount} dias`
      });

      // Show confetti for milestones
      if (result.streakCount % 7 === 0 || [30, 100].includes(result.streakCount)) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  };

  const handleUseForgiveness = () => {
    if (useForgiveness()) {
      toast({
        title: 'Perdão usado! 💫',
        description: 'Seu streak foi mantido'
      });
    }
  };


  return (
    <Card className="glass-card border-border/50 relative overflow-hidden">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="confetti-animation">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="confetti-piece" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'][Math.floor(Math.random() * 4)]
              }} />
            ))}
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className={cn(
              "h-5 w-5 transition-all duration-300",
              streak > 0 ? "text-orange-500 animate-pulse" : "text-muted-foreground"
            )} />
            <span className="font-bold text-sm">
              {streak > 0 ? `${streak} dias` : 'Começar streak'}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {xp.toLocaleString('pt-BR')} XP
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Check-in Button */}
        <div className="space-y-2">
          {canCheckIn ? (
            <Button
              onClick={handleCheckIn}
              className={cn(
                "w-full transition-all duration-300",
                "hover:scale-105 active:scale-95",
                gap === 1 && "animate-pulse"
              )}
              aria-label="Marcar presença de hoje"
            >
              Marcar presença de hoje
            </Button>
          ) : (
            <Button disabled className="w-full" aria-label="Presença já registrada">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Presença registrada
            </Button>
          )}

          {canUseForgiveness && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseForgiveness}
              className="w-full text-xs"
              aria-label="Usar perdão semanal"
            >
              <Gift className="h-3 w-3 mr-1" />
              Perdeu ontem? Usar perdão e manter streak
            </Button>
          )}
        </div>

        {/* Week Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Esta semana</span>
            <span className="text-xs text-muted-foreground">
              {weekDates.filter(date => week[date]).length}/7
            </span>
          </div>
          
          <div className="flex justify-between gap-1">
            {weekDates.map((date, index) => {
              const isToday = date === today;
              const isChecked = week[date];
              
              return (
                <div
                  key={date}
                  className={cn(
                    "flex flex-col items-center gap-1",
                    isToday && "scale-110"
                  )}
                >
                  <span className="text-xs text-muted-foreground">
                    {WEEKDAYS[index]}
                  </span>
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-200",
                      isChecked 
                        ? "bg-primary shadow-md" 
                        : "border-2 border-muted-foreground/30",
                      isToday && "ring-2 ring-primary/50 ring-offset-1 ring-offset-background"
                    )}
                    aria-label={`${WEEKDAYS[index]}: ${isChecked ? 'Completo' : 'Pendente'}${isToday ? ' (hoje)' : ''}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

      </CardContent>

      <style>{`
        .confetti-animation {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        
        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 8px;
          animation: confetti-fall 3s ease-out forwards;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(200px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </Card>
  );
}
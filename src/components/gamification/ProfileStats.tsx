import { TrendingUp, Target, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileStatsProps {
  totalXP: number;
  recentXPGain?: number;
  activitiesCompleted?: number;
  bestStreak?: number;
  className?: string;
}

export function ProfileStats({
  totalXP,
  recentXPGain = 0,
  activitiesCompleted = 0,
  bestStreak = 0,
  className
}: ProfileStatsProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      {/* Total XP */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-md border border-primary/20 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">Total XP</span>
        </div>
        <p className="text-3xl font-bold">{totalXP.toLocaleString()}</p>
        {recentXPGain > 0 && (
          <p className="text-sm text-green-500 mt-1">
            ▲ +{recentXPGain} recente
          </p>
        )}
      </div>

      {/* Atividades */}
      <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 backdrop-blur-md border border-blue-500/20 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-blue-500" />
          <span className="text-sm text-muted-foreground">Atividades</span>
        </div>
        <p className="text-3xl font-bold">{activitiesCompleted}</p>
        <p className="text-sm text-muted-foreground mt-1">entregues</p>
      </div>

      {/* Melhor Streak */}
      <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 backdrop-blur-md border border-amber-500/20 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-5 w-5 text-amber-500" />
          <span className="text-sm text-muted-foreground">Melhor Streak</span>
        </div>
        <p className="text-3xl font-bold">{bestStreak}</p>
        <p className="text-sm text-muted-foreground mt-1">dias consecutivos</p>
      </div>
    </div>
  );
}

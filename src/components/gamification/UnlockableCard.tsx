import { Lock, Check, Zap, Flame, Target, Coins } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UnlockBadge } from './UnlockBadge';
import { cn } from '@/lib/utils';
import { Unlockable } from '@/hooks/useUnlockables';

interface UnlockableCardProps {
  unlockable: Unlockable;
  isUnlocked: boolean;
  isEquipped?: boolean;
  onEquip?: () => void;
  showRequirements?: boolean;
  currentStats?: {
    xp: number;
    streak: number;
    challengesCompleted: number;
    koinsEarned: number;
  };
}

const REQUIREMENT_CONFIG = {
  xp: { icon: Zap, label: 'XP', color: 'text-amber-500' },
  streak: { icon: Flame, label: 'Streak', color: 'text-orange-500' },
  challenges: { icon: Target, label: 'Desafios', color: 'text-blue-500' },
  koins: { icon: Coins, label: 'Koins', color: 'text-yellow-500' },
};

export function UnlockableCard({
  unlockable,
  isUnlocked,
  isEquipped = false,
  onEquip,
  showRequirements = true,
  currentStats,
}: UnlockableCardProps) {
  const renderRequirements = () => {
    const requirements = [];

    if (unlockable.required_xp) {
      requirements.push({
        type: 'xp' as const,
        value: unlockable.required_xp,
        current: currentStats?.xp || 0,
        met: (currentStats?.xp || 0) >= unlockable.required_xp,
      });
    }
    if (unlockable.required_streak_days) {
      requirements.push({
        type: 'streak' as const,
        value: unlockable.required_streak_days,
        current: currentStats?.streak || 0,
        met: (currentStats?.streak || 0) >= unlockable.required_streak_days,
      });
    }
    if (unlockable.required_challenges_completed) {
      requirements.push({
        type: 'challenges' as const,
        value: unlockable.required_challenges_completed,
        current: currentStats?.challengesCompleted || 0,
        met: (currentStats?.challengesCompleted || 0) >= unlockable.required_challenges_completed,
      });
    }
    if (unlockable.required_koins_earned) {
      requirements.push({
        type: 'koins' as const,
        value: unlockable.required_koins_earned,
        current: currentStats?.koinsEarned || 0,
        met: (currentStats?.koinsEarned || 0) >= unlockable.required_koins_earned,
      });
    }

    return requirements;
  };

  const requirements = renderRequirements();

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-2 transition-all hover:scale-[1.02]',
        isUnlocked ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-muted opacity-90',
        isEquipped && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {/* Equipped Badge */}
      {isEquipped && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
          <Check className="h-3 w-3" />
          Equipado
        </div>
      )}

      {/* Lock Overlay - mais sutil para ver requisitos */}
      {!isUnlocked && (
        <div className="absolute top-2 left-2 z-10">
          <div className="flex items-center gap-1 rounded-full bg-muted/90 backdrop-blur-sm px-2 py-1 text-xs font-medium text-muted-foreground">
            <Lock className="h-3 w-3" />
            Bloqueado
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <h3 className="font-bold text-lg leading-tight">{unlockable.name}</h3>
            <p className="text-sm text-muted-foreground">{unlockable.description}</p>
          </div>
          <UnlockBadge rarity={unlockable.rarity as any} isLocked={!isUnlocked} size="sm" />
        </div>

        {/* Preview (Para temas) */}
        {unlockable.type === 'THEME' && unlockable.preview_data && (
          <div className="flex gap-2 h-8">
            <div
              className="flex-1 rounded border border-border"
              style={{ backgroundColor: unlockable.preview_data.background }}
            />
            <div
              className="flex-1 rounded border border-border"
              style={{ backgroundColor: unlockable.preview_data.primary }}
            />
            <div
              className="flex-1 rounded border border-border"
              style={{ backgroundColor: unlockable.preview_data.accent }}
            />
          </div>
        )}

        {/* Requirements com barras de progresso */}
        {showRequirements && requirements.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground">Requisitos para desbloquear:</p>
            {requirements.map((req, idx) => {
              const config = REQUIREMENT_CONFIG[req.type];
              const Icon = config.icon;
              const progress = Math.min((req.current / req.value) * 100, 100);
              
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('flex items-center gap-1 font-medium', config.color)}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                    <span className={cn('font-semibold', req.met ? 'text-green-500' : 'text-muted-foreground')}>
                      {req.current} / {req.value}
                      {req.met && <Check className="h-3 w-3 inline ml-1" />}
                    </span>
                  </div>
                  <Progress 
                    value={progress} 
                    className={cn(
                      'h-1.5',
                      req.met && '[&>div]:bg-green-500'
                    )}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Equip Button */}
        {isUnlocked && !isEquipped && onEquip && (
          <Button onClick={onEquip} className="w-full" size="sm">
            Equipar
          </Button>
        )}
      </div>
    </Card>
  );
}
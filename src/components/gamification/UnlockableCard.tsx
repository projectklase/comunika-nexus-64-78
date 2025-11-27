import { Lock, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
        label: 'XP',
        value: unlockable.required_xp,
        current: currentStats?.xp || 0,
        met: (currentStats?.xp || 0) >= unlockable.required_xp,
      });
    }
    if (unlockable.required_streak_days) {
      requirements.push({
        label: 'Streak',
        value: `${unlockable.required_streak_days} dias`,
        current: currentStats?.streak || 0,
        met: (currentStats?.streak || 0) >= unlockable.required_streak_days,
      });
    }
    if (unlockable.required_challenges_completed) {
      requirements.push({
        label: 'Desafios',
        value: unlockable.required_challenges_completed,
        current: currentStats?.challengesCompleted || 0,
        met: (currentStats?.challengesCompleted || 0) >= unlockable.required_challenges_completed,
      });
    }
    if (unlockable.required_koins_earned) {
      requirements.push({
        label: 'Koins Ganhos',
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
        'relative overflow-hidden border-2 transition-all hover:scale-105',
        isUnlocked ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-muted opacity-75',
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

      {/* Lock Overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-medium">Bloqueado</p>
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
          <UnlockBadge rarity={unlockable.rarity} isLocked={!isUnlocked} size="sm" />
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

        {/* Requirements */}
        {showRequirements && requirements.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground">Requisitos:</p>
            {requirements.map((req, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{req.label}:</span>
                <span className={cn('font-medium', req.met ? 'text-green-500' : 'text-amber-500')}>
                  {req.current} / {req.value}
                </span>
              </div>
            ))}
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

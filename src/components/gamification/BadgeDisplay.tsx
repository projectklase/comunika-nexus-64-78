import { useUnlockables } from '@/hooks/useUnlockables';
import { AchievementBadge } from './AchievementBadge';

interface BadgeDisplayProps {
  userId: string;
  maxDisplay?: number;
}

export function BadgeDisplay({ userId, maxDisplay = 3 }: BadgeDisplayProps) {
  const { getEquippedBadges } = useUnlockables();
  const equippedBadges = getEquippedBadges();

  if (equippedBadges.length === 0) {
    return null;
  }

  const displayedBadges = equippedBadges.slice(0, maxDisplay);
  const remainingCount = equippedBadges.length - maxDisplay;

  return (
    <div className="flex items-center gap-1">
      {displayedBadges.map((unlock) => {
        if (!unlock.unlockable) return null;
        return (
          <AchievementBadge
            key={unlock.id}
            unlockable={unlock.unlockable}
            size="sm"
          />
        );
      })}
      {remainingCount > 0 && (
        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

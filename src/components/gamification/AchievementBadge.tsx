import { Unlockable } from '@/hooks/useUnlockables';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AchievementBadgeProps {
  unlockable: Unlockable;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-5 w-5 text-xs',
  md: 'h-6 w-6 text-sm',
  lg: 'h-8 w-8 text-base',
};

const rarityStyles = {
  COMMON: 'ring-1 ring-gray-400 dark:ring-gray-500',
  UNCOMMON: 'ring-1 ring-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]',
  RARE: 'ring-1 ring-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
  EPIC: 'ring-2 ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]',
  LEGENDARY: 'ring-2 ring-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.7)] animate-shimmer',
};

export function AchievementBadge({ unlockable, size = 'md' }: AchievementBadgeProps) {
  const emoji = unlockable.preview_data?.emoji || '🏅';
  const rarityClass = rarityStyles[unlockable.rarity as keyof typeof rarityStyles] || rarityStyles.COMMON;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div
            className={`
              ${sizeClasses[size]}
              ${rarityClass}
              rounded-full
              bg-background/80
              backdrop-blur-sm
              flex items-center justify-center
              cursor-help
              transition-all duration-300
              hover:scale-110
            `}
          >
            <span className="select-none">{emoji}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <div className="text-center">
            <p className="font-semibold">{unlockable.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {unlockable.description}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

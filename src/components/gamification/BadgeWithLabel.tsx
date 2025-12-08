import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BadgeWithLabelProps {
  unlockable: {
    name: string;
    description?: string;
    rarity: string;
    preview_data?: {
      emoji?: string;
    } | null;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const RARITY_STYLES: Record<string, string> = {
  COMMON: 'border-muted-foreground/30 bg-muted/30',
  UNCOMMON: 'border-green-500/50 bg-green-500/10',
  RARE: 'border-blue-500/50 bg-blue-500/10',
  EPIC: 'border-purple-500/50 bg-purple-500/10',
  LEGENDARY: 'border-amber-400/50 bg-amber-400/10',
};

const SIZE_STYLES = {
  sm: 'text-base px-2 py-1 text-xs',
  md: 'text-lg px-3 py-1.5 text-sm',
  lg: 'text-xl px-4 py-2 text-sm',
};

export function BadgeWithLabel({ unlockable, size = 'md', className, onClick }: BadgeWithLabelProps) {
  const emoji = unlockable.preview_data?.emoji || '🏆';
  const rarityStyle = RARITY_STYLES[unlockable.rarity] || RARITY_STYLES.COMMON;
  const sizeStyle = SIZE_STYLES[size];

  const badgeContent = (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border backdrop-blur-sm transition-all hover:scale-105',
        rarityStyle,
        sizeStyle,
        onClick && 'cursor-pointer active:scale-95',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <span>{emoji}</span>
      <span className="font-medium text-foreground whitespace-nowrap">{unlockable.name}</span>
    </div>
  );

  // Se tem onClick, não usar Tooltip para evitar conflito
  if (onClick) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        {unlockable.description && (
          <TooltipContent side="top" className="max-w-xs">
            <p>{unlockable.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
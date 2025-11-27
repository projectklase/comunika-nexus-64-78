import { Crown, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnlockBadgeProps {
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  isLocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RARITY_CONFIG = {
  COMMON: {
    label: 'Comum',
    icon: Sparkles,
    gradient: 'from-slate-400 to-slate-600',
    glow: 'shadow-slate-500/20',
  },
  RARE: {
    label: 'Raro',
    icon: Sparkles,
    gradient: 'from-blue-400 to-blue-600',
    glow: 'shadow-blue-500/30',
  },
  EPIC: {
    label: 'Épico',
    icon: Sparkles,
    gradient: 'from-purple-400 to-purple-600',
    glow: 'shadow-purple-500/40',
  },
  LEGENDARY: {
    label: 'Lendário',
    icon: Crown,
    gradient: 'from-amber-400 via-yellow-400 to-amber-600',
    glow: 'shadow-amber-500/50',
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'h-5 px-2 text-[10px]',
    icon: 'h-3 w-3',
  },
  md: {
    badge: 'h-6 px-3 text-xs',
    icon: 'h-4 w-4',
  },
  lg: {
    badge: 'h-8 px-4 text-sm',
    icon: 'h-5 w-5',
  },
};

export function UnlockBadge({ rarity, isLocked = false, size = 'md', className }: UnlockBadgeProps) {
  const config = RARITY_CONFIG[rarity];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = isLocked ? Lock : config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold backdrop-blur-md transition-all',
        sizeConfig.badge,
        isLocked
          ? 'bg-muted/80 text-muted-foreground border border-border/50'
          : `bg-gradient-to-r ${config.gradient} text-white shadow-lg ${config.glow}`,
        className
      )}
    >
      <Icon className={cn(sizeConfig.icon, 'shrink-0')} />
      <span>{isLocked ? 'Bloqueado' : config.label}</span>
    </div>
  );
}

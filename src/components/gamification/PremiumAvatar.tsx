import { cn } from '@/lib/utils';

interface PremiumAvatarProps {
  emoji: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const RARITY_CONFIG = {
  COMMON: {
    ring: 'ring-2 ring-gray-300',
    glow: '',
    animation: '',
  },
  UNCOMMON: {
    ring: 'ring-2 ring-green-500',
    glow: 'shadow-[0_0_10px_rgba(34,197,94,0.5)]',
    animation: '',
  },
  RARE: {
    ring: 'ring-2 ring-blue-500',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.6)]',
    animation: '',
  },
  EPIC: {
    ring: 'ring-3 ring-purple-500',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.7)]',
    animation: '',
  },
  LEGENDARY: {
    ring: 'ring-4 ring-yellow-400',
    glow: 'shadow-[0_0_20px_rgba(250,204,21,0.8)]',
    animation: 'animate-pulse',
  },
};

const SIZE_CONFIG = {
  sm: 'w-10 h-10 text-xl',
  md: 'w-16 h-16 text-3xl',
  lg: 'w-24 h-24 text-5xl',
  xl: 'w-32 h-32 text-7xl',
};

export function PremiumAvatar({ emoji, rarity, size = 'md', className }: PremiumAvatarProps) {
  const config = RARITY_CONFIG[rarity];
  const sizeClass = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        'relative rounded-full bg-background flex items-center justify-center',
        sizeClass,
        config.ring,
        config.glow,
        config.animation,
        'transition-all duration-300',
        className
      )}
    >
      <span className="select-none">{emoji}</span>
      
      {rarity === 'LEGENDARY' && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400/20 via-amber-500/20 to-yellow-400/20 animate-spin" style={{ animationDuration: '3s' }} />
      )}
    </div>
  );
}

import { cn } from '@/lib/utils';
import { Shield } from 'lucide-react';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Determina a tier do nível baseado no valor
function getLevelTier(level: number): {
  name: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
} {
  if (level >= 51) {
    return {
      name: 'Diamante',
      colorClass: 'text-cyan-300',
      bgClass: 'bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-purple-500/30',
      borderClass: 'border-cyan-400/60',
      glowClass: 'shadow-cyan-500/40'
    };
  }
  if (level >= 26) {
    return {
      name: 'Ouro',
      colorClass: 'text-amber-300',
      bgClass: 'bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-orange-500/30',
      borderClass: 'border-amber-400/60',
      glowClass: 'shadow-amber-500/40'
    };
  }
  if (level >= 11) {
    return {
      name: 'Prata',
      colorClass: 'text-slate-200',
      bgClass: 'bg-gradient-to-br from-slate-400/30 via-gray-400/20 to-zinc-400/30',
      borderClass: 'border-slate-300/60',
      glowClass: 'shadow-slate-400/40'
    };
  }
  return {
    name: 'Bronze',
    colorClass: 'text-orange-300',
    bgClass: 'bg-gradient-to-br from-orange-700/30 via-amber-700/20 to-yellow-700/30',
    borderClass: 'border-orange-500/60',
    glowClass: 'shadow-orange-500/40'
  };
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg'
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-6 w-6'
};

export function LevelBadge({ level, size = 'md', showLabel = false, className }: LevelBadgeProps) {
  const tier = getLevelTier(level);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl border-2 backdrop-blur-sm shadow-lg',
          tier.bgClass,
          tier.borderClass,
          tier.glowClass,
          sizeClasses[size]
        )}
      >
        {/* Ícone de escudo no fundo */}
        <Shield 
          className={cn(
            'absolute opacity-20',
            tier.colorClass,
            iconSizes[size]
          )}
        />
        
        {/* Número do nível */}
        <span className={cn('font-bold relative z-10', tier.colorClass)}>
          {level}
        </span>
      </div>
      
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Nível</span>
          <span className={cn('text-sm font-semibold', tier.colorClass)}>
            {tier.name}
          </span>
        </div>
      )}
    </div>
  );
}

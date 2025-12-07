import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GameStatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'collection' | 'cards' | 'decks' | 'level';
  progress?: number;
  delay?: number;
}

const variantStyles = {
  default: {
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'from-blue-500/50 to-cyan-500/50',
    iconGlow: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    iconColor: 'text-blue-400',
  },
  collection: {
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'from-emerald-500/50 to-teal-500/50',
    iconGlow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    iconColor: 'text-emerald-400',
  },
  cards: {
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'from-amber-500/50 to-orange-500/50',
    iconGlow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    iconColor: 'text-amber-400',
  },
  decks: {
    gradient: 'from-violet-500/20 to-purple-500/20',
    border: 'from-violet-500/50 to-purple-500/50',
    iconGlow: 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]',
    iconColor: 'text-violet-400',
  },
  level: {
    gradient: 'from-yellow-500/20 to-amber-500/20',
    border: 'from-yellow-500/60 to-amber-500/60',
    iconGlow: 'drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]',
    iconColor: 'text-yellow-400',
  },
};

export function GameStatCard({ 
  icon, 
  title, 
  value, 
  subtitle, 
  variant = 'default',
  progress,
  delay = 0 
}: GameStatCardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: delay * 0.08, ease: 'easeOut' }}
      className="relative group min-w-0 max-w-full overflow-hidden"
    >
      {/* Gradient border */}
      <div className={cn(
        "absolute -inset-[1px] rounded-xl bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity duration-300 blur-[1px]",
        styles.border
      )} />
      
      {/* Card content */}
      <div className={cn(
        "relative rounded-xl p-2.5 sm:p-4 backdrop-blur-md overflow-hidden",
        "bg-gradient-to-br",
        styles.gradient,
        "border border-white/10"
      )}>
        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
          <div className={cn(
            "p-1.5 sm:p-2 rounded-lg bg-black/20 backdrop-blur-sm flex-shrink-0",
            styles.iconColor,
            styles.iconGlow,
            "transition-all duration-300 group-hover:scale-110",
            "[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5"
          )}>
            {icon}
          </div>
          <span className="text-[10px] sm:text-sm font-semibold text-foreground/80 truncate min-w-0">{title}</span>
        </div>

        {/* Value */}
        <p className="text-base sm:text-xl lg:text-2xl font-bold text-foreground mb-0.5 sm:mb-1 truncate">
          {value}
        </p>

        {/* Subtitle or Progress */}
        {progress !== undefined ? (
          <div className="space-y-0.5 sm:space-y-1">
            <div className="h-1.5 sm:h-2 bg-black/30 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: delay * 0.08 + 0.3 }}
                className={cn(
                  "h-full rounded-full bg-gradient-to-r",
                  styles.border
                )}
              />
            </div>
            <p className="text-[9px] sm:text-xs text-foreground/60 truncate">{subtitle}</p>
          </div>
        ) : (
          <p className="text-[9px] sm:text-xs text-foreground/60 truncate">{subtitle}</p>
        )}

        {/* Level card special effect */}
        {variant === 'level' && (
          <div className="absolute -top-4 -right-4 w-12 h-12 sm:w-16 sm:h-16 bg-yellow-500/10 rounded-full blur-xl animate-pulse" />
        )}
      </div>
    </motion.div>
  );
}

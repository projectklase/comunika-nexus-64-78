import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GameActionButtonProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  variant?: 'reward' | 'explore' | 'create' | 'forge';
  onClick: () => void;
  delay?: number;
  badge?: number;
}

const variantStyles = {
  reward: {
    gradient: 'from-amber-600 to-orange-600',
    hoverGradient: 'from-amber-500 to-orange-500',
    glow: 'rgba(245, 158, 11, 0.4)',
    iconBg: 'bg-amber-500/20',
  },
  explore: {
    gradient: 'from-blue-600 to-cyan-600',
    hoverGradient: 'from-blue-500 to-cyan-500',
    glow: 'rgba(59, 130, 246, 0.4)',
    iconBg: 'bg-blue-500/20',
  },
  create: {
    gradient: 'from-violet-600 to-purple-600',
    hoverGradient: 'from-violet-500 to-purple-500',
    glow: 'rgba(139, 92, 246, 0.4)',
    iconBg: 'bg-violet-500/20',
  },
  forge: {
    gradient: 'from-orange-600 to-red-600',
    hoverGradient: 'from-orange-500 to-red-500',
    glow: 'rgba(239, 68, 68, 0.4)',
    iconBg: 'bg-orange-500/20',
  },
};

export function GameActionButton({ 
  icon, 
  title, 
  subtitle, 
  variant = 'reward',
  onClick,
  delay = 0,
  badge
}: GameActionButtonProps) {
  const styles = variantStyles[variant];

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.08, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative group w-full flex flex-col items-center gap-2 sm:gap-3 rounded-xl overflow-hidden",
        "min-h-[100px] sm:min-h-[140px]",
        "p-3 sm:p-6",
        "bg-gradient-to-br",
        styles.gradient,
        "border border-white/20",
        "transition-all duration-300",
        "active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-white/30",
        "min-w-0 max-w-full"
      )}
      style={{
        boxShadow: `0 4px 20px -4px ${styles.glow}`,
      }}
    >
      {/* Animated shine effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
      </div>

      {/* Glow effect on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at center, ${styles.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Icon container */}
      <motion.div 
        className={cn(
          "relative rounded-xl backdrop-blur-sm flex-shrink-0",
          "p-2 sm:p-3",
          styles.iconBg,
          "border border-white/10"
        )}
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-5 h-5 sm:w-8 sm:h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
          {icon}
        </div>
      </motion.div>

      {/* Text */}
      <div className="relative text-center z-10 min-w-0 max-w-full px-1">
        <p className="font-bold text-white text-xs sm:text-base lg:text-lg drop-shadow-md truncate">{title}</p>
        <p className="text-[9px] sm:text-xs text-white/70 truncate">{subtitle}</p>
      </div>

      {/* Badge */}
      {badge && badge > 0 && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full min-w-[18px] h-[18px] sm:min-w-[24px] sm:h-6 flex items-center justify-center px-1 shadow-lg">
          {badge > 99 ? '99+' : badge}
        </div>
      )}

      {/* Bottom highlight */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </motion.button>
  );
}

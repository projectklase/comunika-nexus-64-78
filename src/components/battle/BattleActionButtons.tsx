import { motion } from 'framer-motion';
import { Swords, Hand, ArrowRight, Loader2 } from 'lucide-react';

interface BattleActionButtonsProps {
  canPlayCard: boolean;
  canAttack: boolean;
  isMyTurn: boolean;
  onPlayCard: () => void;
  onAttack: () => void;
  onEndTurn: () => void;
  isLoading?: boolean;
}

const variantStyles = {
  play: {
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]',
    iconBg: 'bg-amber-400/20',
    disabledGradient: 'from-amber-500/30 to-orange-600/30',
  },
  attack: {
    gradient: 'from-red-500 to-rose-600',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]',
    iconBg: 'bg-red-400/20',
    disabledGradient: 'from-red-500/30 to-rose-600/30',
  },
  endTurn: {
    gradient: 'from-blue-500 to-cyan-600',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
    hoverGlow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]',
    iconBg: 'bg-blue-400/20',
    disabledGradient: 'from-blue-500/30 to-cyan-600/30',
  },
};

interface ActionButtonProps {
  onClick: () => void;
  disabled: boolean;
  variant: keyof typeof variantStyles;
  icon: React.ReactNode;
  label: string;
  isLoading?: boolean;
}

const ActionButton = ({ onClick, disabled, variant, icon, label, isLoading }: ActionButtonProps) => {
  const styles = variantStyles[variant];
  
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        relative flex-1 flex items-center justify-center gap-2 
        px-4 py-3 rounded-xl font-semibold text-white
        transition-all duration-300
        ${disabled 
          ? `bg-gradient-to-r ${styles.disabledGradient} cursor-not-allowed opacity-50` 
          : `bg-gradient-to-r ${styles.gradient} ${styles.glow} ${styles.hoverGlow} hover:scale-[1.02] active:scale-[0.98]`
        }
        border border-white/10
        overflow-hidden
      `}
      whileHover={!disabled ? { y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {/* Shine effect */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        />
      )}
      
      {/* Icon container */}
      <div className={`p-1.5 rounded-lg ${styles.iconBg}`}>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <motion.div
            animate={!disabled ? { rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {icon}
          </motion.div>
        )}
      </div>
      
      <span className="relative z-10 text-sm">{label}</span>
    </motion.button>
  );
};

export const BattleActionButtons = ({
  canPlayCard,
  canAttack,
  isMyTurn,
  onPlayCard,
  onAttack,
  onEndTurn,
  isLoading,
}: BattleActionButtonsProps) => {
  if (!isMyTurn) {
    return (
      <motion.div 
        className="flex items-center justify-center p-4 bg-muted/10 backdrop-blur-sm rounded-xl border border-border/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-5 h-5 text-muted-foreground" />
          </motion.div>
          <p className="text-sm text-muted-foreground">Aguardando turno do oponente...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/10 via-red-500/10 to-blue-500/10 rounded-2xl blur-lg" />
      
      {/* Main container */}
      <div className="relative flex items-center gap-3 p-4 bg-background/60 backdrop-blur-md rounded-xl border border-primary/20">
        <ActionButton
          onClick={onPlayCard}
          disabled={!canPlayCard}
          variant="play"
          icon={<Hand className="w-4 h-4" />}
          label="Jogar Carta"
          isLoading={isLoading}
        />

        <ActionButton
          onClick={onAttack}
          disabled={!canAttack}
          variant="attack"
          icon={<Swords className="w-4 h-4" />}
          label="Atacar"
          isLoading={isLoading}
        />

        <ActionButton
          onClick={onEndTurn}
          disabled={false}
          variant="endTurn"
          icon={<ArrowRight className="w-4 h-4" />}
          label="Passar"
          isLoading={isLoading}
        />
      </div>
    </motion.div>
  );
};

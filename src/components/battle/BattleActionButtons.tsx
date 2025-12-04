import { motion } from 'framer-motion';
import { Swords, Hand, ArrowRight, Loader2, Check, Shield } from 'lucide-react';

interface BattleActionButtonsProps {
  canPlayCard: boolean;
  canAttack: boolean;
  isMyTurn: boolean;
  onPlayCard: () => void;
  onAttack: () => void;
  onEndTurn: () => void;
  isLoading?: boolean;
  isSetupPhase?: boolean;
  hasAttackedThisTurn?: boolean;
  hasPlayedCardThisTurn?: boolean;
}

type ButtonState = 'enabled' | 'disabled' | 'completed' | 'blocked';

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

const completedStyles = {
  gradient: 'from-emerald-500/60 to-green-600/60',
  glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
  iconBg: 'bg-emerald-400/20',
};

const highlightedStyles = {
  gradient: 'from-yellow-400 via-amber-500 to-yellow-400',
  glow: 'shadow-[0_0_30px_rgba(251,191,36,0.6)]',
  hoverGlow: 'hover:shadow-[0_0_40px_rgba(251,191,36,0.8)]',
  iconBg: 'bg-yellow-400/30',
};

interface ActionButtonProps {
  onClick: () => void;
  disabled: boolean;
  variant: keyof typeof variantStyles;
  icon: React.ReactNode;
  label: string;
  isLoading?: boolean;
  state?: ButtonState;
  completedLabel?: string;
  isHighlighted?: boolean;
}

const ActionButton = ({ 
  onClick, 
  disabled, 
  variant, 
  icon, 
  label, 
  isLoading,
  state = 'enabled',
  completedLabel,
  isHighlighted
}: ActionButtonProps) => {
  const baseStyles = variantStyles[variant];
  const isCompleted = state === 'completed';
  const isBlocked = state === 'blocked';
  
  // Determine which styles to use
  const getGradient = () => {
    if (isHighlighted) return highlightedStyles.gradient;
    if (isCompleted) return completedStyles.gradient;
    if (disabled || isBlocked) return baseStyles.disabledGradient;
    return baseStyles.gradient;
  };
  
  const getGlow = () => {
    if (isHighlighted) return highlightedStyles.glow;
    if (isCompleted) return completedStyles.glow;
    if (disabled || isBlocked) return '';
    return baseStyles.glow;
  };
  
  const getHoverGlow = () => {
    if (isHighlighted) return highlightedStyles.hoverGlow;
    if (disabled || isCompleted || isBlocked) return '';
    return baseStyles.hoverGlow;
  };
  
  const getIconBg = () => {
    if (isHighlighted) return highlightedStyles.iconBg;
    if (isCompleted) return completedStyles.iconBg;
    return baseStyles.iconBg;
  };
  
  const displayLabel = isCompleted && completedLabel ? completedLabel : label;
  const displayIcon = isCompleted ? <Check className="w-4 h-4" /> : icon;
  
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading || isCompleted || isBlocked}
      className={`
        relative flex-1 flex items-center justify-center gap-2 
        px-4 py-3 rounded-xl font-semibold text-white
        transition-all duration-300
        bg-gradient-to-r ${getGradient()} ${getGlow()} ${getHoverGlow()}
        ${(disabled || isCompleted || isBlocked) ? 'cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
        ${isCompleted ? 'opacity-80' : disabled || isBlocked ? 'opacity-50' : ''}
        border border-white/10
        overflow-hidden
      `}
      whileHover={(!disabled && !isCompleted && !isBlocked) ? { y: -2 } : {}}
      whileTap={(!disabled && !isCompleted && !isBlocked) ? { scale: 0.98 } : {}}
      animate={isHighlighted ? {
        scale: [1, 1.02, 1],
      } : {}}
      transition={isHighlighted ? {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      } : {}}
    >
      {/* Shine effect */}
      {!disabled && !isCompleted && !isBlocked && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        />
      )}
      
      {/* Highlighted pulsing border */}
      {isHighlighted && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-yellow-300/60"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      
      {/* Icon container */}
      <div className={`p-1.5 rounded-lg ${getIconBg()}`}>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <motion.div
            animate={(!disabled && !isCompleted && !isBlocked) ? { rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {displayIcon}
          </motion.div>
        )}
      </div>
      
      <span className="relative z-10 text-sm">{displayLabel}</span>
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
  isSetupPhase = false,
  hasAttackedThisTurn = false,
  hasPlayedCardThisTurn = false,
}: BattleActionButtonsProps) => {
  // Determine if "End Turn" should be highlighted
  const allActionsDone = hasPlayedCardThisTurn && hasAttackedThisTurn;
  const shouldHighlightEndTurn = isMyTurn && (allActionsDone || (hasPlayedCardThisTurn && isSetupPhase));
  
  // Determine button states
  const getPlayCardState = (): ButtonState => {
    if (hasPlayedCardThisTurn) return 'completed';
    if (!canPlayCard) return 'disabled';
    return 'enabled';
  };
  
  const getAttackState = (): ButtonState => {
    if (hasAttackedThisTurn) return 'completed';
    if (isSetupPhase) return 'blocked';
    if (!canAttack) return 'disabled';
    return 'enabled';
  };

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
          completedLabel="✓ Jogada"
          isLoading={isLoading}
          state={getPlayCardState()}
        />

        <div className="relative flex-1 flex">
          <ActionButton
            onClick={onAttack}
            disabled={!canAttack}
            variant="attack"
            icon={isSetupPhase ? <Shield className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
            label={isSetupPhase ? "Bloqueado" : "Atacar"}
            completedLabel="✓ Atacou"
            isLoading={isLoading}
            state={getAttackState()}
          />
          {isSetupPhase && !hasAttackedThisTurn && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-yellow-400 font-medium bg-black/80 px-2 py-1 rounded">
              Fase de Preparação
            </div>
          )}
        </div>

        <ActionButton
          onClick={onEndTurn}
          disabled={false}
          variant="endTurn"
          icon={<ArrowRight className="w-4 h-4" />}
          label={shouldHighlightEndTurn ? "⚡ Passar" : "Passar"}
          isLoading={isLoading}
          isHighlighted={shouldHighlightEndTurn}
        />
      </div>
    </motion.div>
  );
};

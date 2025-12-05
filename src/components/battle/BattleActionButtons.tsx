import { motion } from 'framer-motion';
import { Swords, Hand, ArrowRight, Loader2, Check, Shield, Moon } from 'lucide-react';

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
  hasSummoningSickness?: boolean; // NEW: Monster was just summoned
}

type ButtonState = 'enabled' | 'disabled' | 'completed' | 'blocked' | 'summoning';

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

// NEW: Summoning sickness (Invocado) styles - purple/indigo theme
const summoningStyles = {
  gradient: 'from-indigo-500/50 to-purple-600/50',
  glow: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]',
  iconBg: 'bg-indigo-400/20',
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
  tooltip?: string; // NEW: Tooltip text
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
  isHighlighted,
  tooltip
}: ActionButtonProps) => {
  const baseStyles = variantStyles[variant];
  const isCompleted = state === 'completed';
  const isBlocked = state === 'blocked';
  const isSummoning = state === 'summoning';
  
  // Determine which styles to use
  const getGradient = () => {
    if (isHighlighted) return highlightedStyles.gradient;
    if (isCompleted) return completedStyles.gradient;
    if (isSummoning) return summoningStyles.gradient;
    if (disabled || isBlocked) return baseStyles.disabledGradient;
    return baseStyles.gradient;
  };
  
  const getGlow = () => {
    if (isHighlighted) return highlightedStyles.glow;
    if (isCompleted) return completedStyles.glow;
    if (isSummoning) return summoningStyles.glow;
    if (disabled || isBlocked) return '';
    return baseStyles.glow;
  };
  
  const getHoverGlow = () => {
    if (isHighlighted) return highlightedStyles.hoverGlow;
    if (disabled || isCompleted || isBlocked || isSummoning) return '';
    return baseStyles.hoverGlow;
  };
  
  const getIconBg = () => {
    if (isHighlighted) return highlightedStyles.iconBg;
    if (isCompleted) return completedStyles.iconBg;
    if (isSummoning) return summoningStyles.iconBg;
    return baseStyles.iconBg;
  };
  
  const displayLabel = isCompleted && completedLabel ? completedLabel : label;
  const displayIcon = isCompleted ? <Check className="w-4 h-4" /> : icon;
  
  const isDisabledState = disabled || isLoading || isCompleted || isBlocked || isSummoning;
  
  return (
    <div className="relative flex-1 group">
      <motion.button
        onClick={onClick}
        disabled={isDisabledState}
        className={`
          w-full flex items-center justify-center gap-2 
          px-4 py-3 rounded-xl font-semibold text-white
          transition-all duration-300
          bg-gradient-to-r ${getGradient()} ${getGlow()} ${getHoverGlow()}
          ${isDisabledState ? 'cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
          ${isCompleted ? 'opacity-80' : (disabled || isBlocked || isSummoning) ? 'opacity-60' : ''}
          border border-white/10
          overflow-hidden
        `}
        whileHover={!isDisabledState ? { y: -2 } : {}}
        whileTap={!isDisabledState ? { scale: 0.98 } : {}}
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
        {!isDisabledState && (
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
        
        {/* Summoning sickness pulsing moon effect */}
        {isSummoning && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-indigo-400/40"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        
        {/* Icon container */}
        <div className={`p-1.5 rounded-lg ${getIconBg()}`}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <motion.div
              animate={!isDisabledState ? { rotate: [0, 5, -5, 0] } : isSummoning ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {displayIcon}
            </motion.div>
          )}
        </div>
        
        <span className="relative z-10 text-sm">{displayLabel}</span>
      </motion.button>
      
      {/* Tooltip - shows on hover when there's a tooltip message */}
      {tooltip && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white font-medium bg-black/90 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-indigo-500/30">
          {tooltip}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 rotate-45 border-r border-b border-indigo-500/30" />
        </div>
      )}
    </div>
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
  hasSummoningSickness = false,
}: BattleActionButtonsProps) => {
  // Determine if "End Turn" should be highlighted
  const allActionsDone = hasPlayedCardThisTurn && hasAttackedThisTurn;
  const shouldHighlightEndTurn = isMyTurn && (allActionsDone || (hasPlayedCardThisTurn && isSetupPhase) || (hasPlayedCardThisTurn && hasSummoningSickness));
  
  // Determine button states
  const getPlayCardState = (): ButtonState => {
    if (hasPlayedCardThisTurn) return 'completed';
    if (!canPlayCard) return 'disabled';
    return 'enabled';
  };
  
  const getAttackState = (): ButtonState => {
    if (hasAttackedThisTurn) return 'completed';
    if (isSetupPhase) return 'blocked';
    if (hasSummoningSickness) return 'summoning'; // NEW: Show summoning state
    if (!canAttack) return 'disabled';
    return 'enabled';
  };
  
  // Get attack button label and icon
  const getAttackLabel = () => {
    if (isSetupPhase) return "Bloqueado";
    if (hasSummoningSickness) return "🌙 Invocado";
    return "Atacar";
  };
  
  const getAttackIcon = () => {
    if (isSetupPhase) return <Shield className="w-4 h-4" />;
    if (hasSummoningSickness) return <Moon className="w-4 h-4" />;
    return <Swords className="w-4 h-4" />;
  };
  
  // Get tooltip for attack button
  const getAttackTooltip = () => {
    if (hasSummoningSickness) return "Monstro não pode atacar no turno em que foi invocado";
    if (isSetupPhase) return "Fase de Preparação - Ataques bloqueados";
    return undefined;
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

        <ActionButton
          onClick={onAttack}
          disabled={!canAttack}
          variant="attack"
          icon={getAttackIcon()}
          label={getAttackLabel()}
          completedLabel="✓ Atacou"
          isLoading={isLoading}
          state={getAttackState()}
          tooltip={getAttackTooltip()}
        />

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
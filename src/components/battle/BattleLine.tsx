import { CardInPlay } from '@/hooks/useBattle';
import { BattleCard } from './BattleCard';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { useMemo, memo } from 'react';

interface BattleLineProps {
  lineNumber: 1 | 2 | 3;
  playerCards: CardInPlay[];
  opponentCards: CardInPlay[];
  onCardClick?: (card: any) => void;
  isMyTurn: boolean;
  canPlayOnLine: boolean;
  isAttacking?: boolean;
}

export const BattleLine = memo(({
  lineNumber,
  playerCards,
  opponentCards,
  onCardClick,
  isMyTurn,
  canPlayOnLine,
  isAttacking = false,
}: BattleLineProps) => {
  // Calculate line power
  const playerPower = useMemo(
    () => playerCards.reduce((sum, card) => sum + card.atk, 0),
    [playerCards]
  );
  
  const opponentPower = useMemo(
    () => opponentCards.reduce((sum, card) => sum + card.atk, 0),
    [opponentCards]
  );

  // Determine line colors based on lineNumber
  const lineColors = {
    1: {
      bg: 'from-red-950/20 to-red-900/10',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/20',
      accent: 'text-red-400',
    },
    2: {
      bg: 'from-blue-950/20 to-blue-900/10',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/20',
      accent: 'text-blue-400',
    },
    3: {
      bg: 'from-green-950/20 to-green-900/10',
      border: 'border-green-500/30',
      glow: 'shadow-green-500/20',
      accent: 'text-green-400',
    },
  }[lineNumber];

  const isWinning = playerPower > opponentPower;
  const isLosing = playerPower < opponentPower;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isAttacking ? [1, 1.02, 1] : 1,
      }}
      transition={{ 
        opacity: { duration: 0.3 },
        scale: { duration: 0.5, repeat: isAttacking ? 3 : 0 },
      }}
      className={`
        battle-line-${lineNumber} relative rounded-xl border-2 p-2 sm:p-3 lg:p-4 backdrop-blur-sm
        bg-gradient-to-r ${lineColors.bg}
        ${lineColors.border}
        ${canPlayOnLine && isMyTurn ? 'shadow-lg ' + lineColors.glow : ''}
        ${isAttacking ? 'ring-4 ring-orange-500/50' : ''}
        transition-all duration-300
      `}
    >
      {/* Line number badge */}
      <div className="absolute -top-2 sm:-top-3 left-2 sm:left-4 px-2 sm:px-3 py-0.5 sm:py-1 bg-background border-2 border-current rounded-lg">
        <span className={`text-xs sm:text-sm font-bold ${lineColors.accent}`}>
          Linha {lineNumber}
        </span>
      </div>

      {/* Attack indicator */}
      {isAttacking && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-orange-500"
          >
            <Swords className="w-16 h-16" />
          </motion.div>
        </motion.div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-8 mt-2">
        {/* Opponent side */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] sm:text-xs font-medium text-muted-foreground uppercase">
              Oponente
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-destructive/20 rounded border border-destructive/30">
              <Swords className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-destructive" />
              <span className="text-xs sm:text-sm font-bold text-destructive">
                {opponentPower}
              </span>
            </div>
          </div>
          
          <div className="flex gap-1 sm:gap-2 min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] items-center justify-center">
            {opponentCards.length > 0 ? (
              opponentCards.map((card, idx) => (
                <motion.div
                  key={`${card.id}-${idx}`}
                  initial={{ opacity: 0, scale: 0.8, rotateY: 180 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <BattleCard card={card} showEffects={false} />
                </motion.div>
              ))
            ) : (
              <div className="text-[0.65rem] sm:text-xs text-muted-foreground/50 italic">
                Nenhuma carta
              </div>
            )}
          </div>
        </div>

        {/* Player side */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] sm:text-xs font-medium text-muted-foreground uppercase">
              Você
            </span>
            <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border ${
              isWinning 
                ? 'bg-success/20 border-success/30'
                : isLosing
                ? 'bg-destructive/20 border-destructive/30'
                : 'bg-primary/20 border-primary/30'
            }`}>
              <Swords className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                isWinning ? 'text-success' : isLosing ? 'text-destructive' : 'text-primary'
              }`} />
              <span className={`text-xs sm:text-sm font-bold ${
                isWinning ? 'text-success' : isLosing ? 'text-destructive' : 'text-primary'
              }`}>
                {playerPower}
              </span>
            </div>
          </div>

          {/* Drop zone */}
          <motion.div
            whileHover={canPlayOnLine && isMyTurn ? { scale: 1.02 } : {}}
            onClick={canPlayOnLine && isMyTurn ? onCardClick : undefined}
            className={`
              flex gap-1 sm:gap-2 min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] items-center justify-center rounded-lg border-2 border-dashed
              ${canPlayOnLine && isMyTurn
                ? 'border-primary bg-primary/10 cursor-pointer hover:bg-primary/20'
                : 'border-border/30 bg-background/5'
              }
              transition-colors
            `}
          >
            {playerCards.length > 0 ? (
              playerCards.map((card, idx) => (
                <motion.div
                  key={`${card.id}-${idx}`}
                  initial={{ opacity: 0, y: 100, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                    delay: idx * 0.1,
                  }}
                  className="animate-card-fly-in"
                >
                  <BattleCard card={card} showEffects={true} />
                </motion.div>
              ))
            ) : canPlayOnLine && isMyTurn ? (
              <div className="text-[0.65rem] sm:text-xs text-primary/70 font-medium">
                Clique para jogar carta aqui
              </div>
            ) : (
              <div className="text-[0.65rem] sm:text-xs text-muted-foreground/50 italic">
                Nenhuma carta
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
});

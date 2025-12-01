import { CardInPlay } from '@/hooks/useBattle';
import { BattleCard } from './BattleCard';
import { motion } from 'framer-motion';
import { Swords, Shield, Target } from 'lucide-react';
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

const LINE_TYPES = {
  1: { 
    name: 'Linha de Combate', 
    icon: Swords, 
    color: 'from-red-500/20 to-orange-500/20', 
    borderColor: 'border-red-500/40',
    glowColor: 'shadow-red-500/50',
  },
  2: { 
    name: 'Linha de Alcance', 
    icon: Target, 
    color: 'from-blue-500/20 to-cyan-500/20', 
    borderColor: 'border-blue-500/40',
    glowColor: 'shadow-blue-500/50',
  },
  3: { 
    name: 'Linha de Cerco', 
    icon: Shield, 
    color: 'from-purple-500/20 to-pink-500/20', 
    borderColor: 'border-purple-500/40',
    glowColor: 'shadow-purple-500/50',
  },
};

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

  const lineType = LINE_TYPES[lineNumber];
  const LineIcon = lineType.icon;

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
        relative rounded-xl overflow-hidden border-2 backdrop-blur-sm
        bg-gradient-to-r ${lineType.color}
        ${lineType.borderColor}
        ${canPlayOnLine && isMyTurn ? `shadow-lg ${lineType.glowColor} ring-2 ring-primary` : ''}
        ${isAttacking ? 'ring-4 ring-orange-500/50 animate-pulse' : ''}
        transition-all duration-300
      `}
    >
      {/* Header with line name */}
      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-background/60 border-b border-border/30">
        <LineIcon className="w-4 h-4 lg:w-5 lg:h-5 text-foreground/80" />
        <span className="text-xs lg:text-sm font-bold text-foreground/90">{lineType.name}</span>
      </div>

      {/* Horizontal Layout: Opponent (Left) vs Player (Right) */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 lg:gap-6 items-center p-3 lg:p-4">
        
        {/* Opponent Side (Left) */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-destructive/20 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-destructive/40 shadow-md">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-destructive" />
              <span className="text-sm lg:text-base font-bold text-destructive">{opponentPower}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 lg:gap-2 justify-center min-h-[90px] lg:min-h-[110px] items-center">
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
              <div className="text-xs text-muted-foreground/60 italic">
                Vazio
              </div>
            )}
          </div>
        </div>

        {/* Center Divider with Animated Icon */}
        <div className="flex flex-col items-center">
          <motion.div
            animate={isAttacking ? { 
              rotate: [0, 180, 360],
              scale: [1, 1.3, 1]
            } : {}}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-br from-primary/40 to-accent/40 rounded-full p-2 lg:p-3 border-2 border-primary/60 shadow-xl"
          >
            <Swords className="w-5 h-5 lg:w-7 lg:h-7 text-primary" />
          </motion.div>
        </div>

        {/* Player Side (Right) */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary/20 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-primary/40 shadow-md">
            <div className="flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary" />
              <span className="text-sm lg:text-base font-bold text-primary">{playerPower}</span>
            </div>
          </div>
          
          {/* Drop zone with click handler */}
          <motion.div
            whileHover={canPlayOnLine && isMyTurn ? { scale: 1.02 } : {}}
            onClick={canPlayOnLine && isMyTurn ? onCardClick : undefined}
            className={`
              flex flex-wrap gap-1.5 lg:gap-2 justify-center min-h-[90px] lg:min-h-[110px] items-center
              rounded-lg border-2 border-dashed p-2
              ${canPlayOnLine && isMyTurn
                ? 'border-primary bg-primary/10 cursor-pointer hover:bg-primary/20 animate-pulse'
                : 'border-border/30 bg-background/5'
              }
              transition-all duration-300
            `}
          >
            {playerCards.length > 0 ? (
              playerCards.map((card, idx) => (
                <motion.div
                  key={`${card.id}-${idx}`}
                  initial={{ opacity: 0, y: 50, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: idx * 0.1,
                  }}
                >
                  <BattleCard card={card} showEffects={true} />
                </motion.div>
              ))
            ) : canPlayOnLine && isMyTurn ? (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-xs lg:text-sm font-bold text-primary flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Clique para jogar
              </motion.div>
            ) : (
              <div className="text-xs text-muted-foreground/60 italic">
                Vazio
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Attack effect overlay */}
      {isAttacking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 0.8, repeat: 3 }}
          className="absolute inset-0 bg-orange-500/30 pointer-events-none"
        />
      )}
    </motion.div>
  );
});

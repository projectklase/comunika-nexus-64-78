import { AnimatePresence, motion } from 'framer-motion';
import { BattleCard } from './BattleCard';
import { TrapCard } from './TrapCard';
import { Shield, Sparkles, Swords, Moon } from 'lucide-react';

interface FieldMonster {
  id: string;
  name: string;
  atk: number;
  def: number;
  effects: any[];
  image_url?: string;
  rarity?: string;
  summoned_on_turn?: number;
  current_hp?: number;
  max_hp?: number;
}

interface FieldTrap {
  id: string;
  name: string;
  effects: any[];
  is_facedown: boolean;
}

interface BattleFieldEnhancedProps {
  monster?: FieldMonster | null;
  traps?: FieldTrap[];
  isOpponent?: boolean;
  hasAttackedThisTurn?: boolean;
  currentTurnNumber?: number;
  isMyField?: boolean;
}

// Monster status badge component
const MonsterBadge = ({ type }: { type: 'attacked' | 'summoned' }) => {
  const isAttacked = type === 'attacked';
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        absolute -top-2 -right-2 z-20
        px-2 py-1 rounded-full
        text-[10px] font-bold uppercase tracking-wide
        flex items-center gap-1
        ${isAttacked 
          ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
          : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]'
        }
      `}
    >
      {isAttacked ? (
        <>
          <Swords className="w-3 h-3" />
          <span>Atacou</span>
        </>
      ) : (
        <>
          <Moon className="w-3 h-3" />
          <span>Invocado</span>
        </>
      )}
    </motion.div>
  );
};

export const BattleFieldEnhanced = ({ 
  monster, 
  traps = [], 
  isOpponent,
  hasAttackedThisTurn = false,
  currentTurnNumber = 1,
  isMyField = false
}: BattleFieldEnhancedProps) => {
  const accentColor = isOpponent ? 'red' : 'blue';
  
  // Determine monster status for my field only
  const hasSummoningSickness = isMyField && monster?.summoned_on_turn === currentTurnNumber;
  const hasAttacked = isMyField && hasAttackedThisTurn && monster;
  
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: isOpponent ? -20 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Outer glow effect */}
      <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r ${
        isOpponent 
          ? 'from-red-500/30 via-orange-500/20 to-red-500/30' 
          : 'from-blue-500/30 via-cyan-500/20 to-blue-500/30'
      } blur-md opacity-60 animate-pulse`} />
      
      {/* Main container */}
      <div className={`
        relative flex ${isOpponent ? 'flex-row-reverse' : 'flex-row'} 
        items-center justify-between gap-4 p-6 
        bg-gradient-to-br from-background/40 via-background/60 to-background/40 
        backdrop-blur-md rounded-2xl 
        border-2 ${isOpponent ? 'border-red-500/40' : 'border-blue-500/40'}
        shadow-2xl min-h-[180px]
        overflow-hidden
      `}>
        {/* Decorative corners */}
        <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-2xl ${
          isOpponent ? 'border-red-400/60' : 'border-blue-400/60'
        }`} />
        <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-2xl ${
          isOpponent ? 'border-red-400/60' : 'border-blue-400/60'
        }`} />
        <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-2xl ${
          isOpponent ? 'border-red-400/60' : 'border-blue-400/60'
        }`} />
        <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-2xl ${
          isOpponent ? 'border-red-400/60' : 'border-blue-400/60'
        }`} />

        {/* Inner floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-1 h-1 rounded-full ${
                isOpponent ? 'bg-red-400/40' : 'bg-blue-400/40'
              }`}
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 30}%`,
              }}
              animate={{
                y: [-5, 5, -5],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        {/* Monster Zone */}
        <div className="flex-1 flex items-center justify-center relative z-10">
          <AnimatePresence mode="wait">
            {monster ? (
              <motion.div
                key={monster.id}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ 
                  scale: 0, 
                  opacity: 0, 
                  rotate: 180,
                  filter: 'brightness(2)',
                }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="relative"
              >
                {/* Card glow */}
                <div className={`absolute -inset-2 rounded-xl bg-gradient-to-r ${
                  isOpponent 
                    ? 'from-red-500/40 to-orange-500/40' 
                    : 'from-blue-500/40 to-cyan-500/40'
                } blur-lg opacity-60`} />
                
                {/* Monster status badges - only on my field */}
                {hasAttacked && <MonsterBadge type="attacked" />}
                {hasSummoningSickness && !hasAttacked && <MonsterBadge type="summoned" />}
                
                <div className="relative">
                  <BattleCard
                    card={monster as any}
                    isSelected={false}
                    isSelectable={false}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                {/* Magic circle for empty slot */}
                <div className={`
                  w-32 h-44 rounded-xl 
                  border-2 border-dashed ${isOpponent ? 'border-red-500/30' : 'border-blue-500/30'}
                  flex flex-col items-center justify-center gap-2
                  bg-gradient-to-br ${isOpponent ? 'from-red-500/5 to-transparent' : 'from-blue-500/5 to-transparent'}
                  relative overflow-hidden
                `}>
                  {/* Animated ring */}
                  <motion.div
                    className={`absolute inset-4 rounded-full border ${
                      isOpponent ? 'border-red-500/20' : 'border-blue-500/20'
                    }`}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className={`absolute inset-8 rounded-full border ${
                      isOpponent ? 'border-red-400/15' : 'border-blue-400/15'
                    }`}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  />
                  
                  <Sparkles className={`w-6 h-6 ${isOpponent ? 'text-red-400/40' : 'text-blue-400/40'}`} />
                  <span className="text-xs text-muted-foreground text-center px-2">
                    {isOpponent ? 'Monstro Inimigo' : 'Seu Monstro'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trap Zone */}
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center gap-1.5 justify-center">
            <Shield className={`w-3 h-3 ${isOpponent ? 'text-red-400/60' : 'text-blue-400/60'}`} />
            <span className={`text-xs font-medium ${isOpponent ? 'text-red-300/80' : 'text-blue-300/80'}`}>
              {isOpponent ? 'Traps Inimigas' : 'Suas Traps'}
            </span>
          </div>
          <div className="flex gap-2">
            {traps.map((trap, index) => (
              <motion.div
                key={trap.id}
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1, type: 'spring' }}
                className="relative"
              >
                <div className={`absolute -inset-1 rounded-lg ${
                  isOpponent ? 'bg-red-500/20' : 'bg-blue-500/20'
                } blur-sm`} />
                <div className="relative">
                  <TrapCard
                    isFacedown={trap.is_facedown}
                    trapName={trap.name}
                  />
                </div>
              </motion.div>
            ))}
            {traps.length === 0 && (
              <div className={`
                w-20 h-28 rounded-lg 
                border border-dashed ${isOpponent ? 'border-red-500/20' : 'border-blue-500/20'}
                flex items-center justify-center
                bg-gradient-to-br ${isOpponent ? 'from-red-500/5 to-transparent' : 'from-blue-500/5 to-transparent'}
              `}>
                <span className="text-[10px] text-muted-foreground/60 text-center">Sem traps</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

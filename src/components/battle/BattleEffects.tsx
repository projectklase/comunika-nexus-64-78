import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface AttackEffect {
  id: number;
  lineNumber: number;
  damage: number;
  timestamp: number;
}

interface BattleEffectsProps {
  attackEffects: AttackEffect[];
  onEffectComplete?: (id: number) => void;
}

export const BattleEffects = ({ attackEffects, onEffectComplete }: BattleEffectsProps) => {
  return (
    <AnimatePresence>
      {attackEffects.map((effect) => (
        <AttackAnimation
          key={effect.id}
          effect={effect}
          onComplete={() => onEffectComplete?.(effect.id)}
        />
      ))}
    </AnimatePresence>
  );
};

interface AttackAnimationProps {
  effect: AttackEffect;
  onComplete: () => void;
}

const AttackAnimation = ({ effect, onComplete }: AttackAnimationProps) => {
  // Determine damage intensity and colors
  const isLight = effect.damage <= 10;
  const isMedium = effect.damage > 10 && effect.damage <= 20;
  const isHeavy = effect.damage > 20;
  const isCritical = effect.damage > 20;

  const damageColor = isLight 
    ? 'text-white' 
    : isMedium 
    ? 'text-yellow-400' 
    : 'text-red-500';

  const particleColors = isLight
    ? ['#ffffff', '#e5e5e5']
    : isMedium
    ? ['#fbbf24', '#f59e0b', '#fb923c']
    : ['#ef4444', '#dc2626', '#b91c1c'];

  useEffect(() => {
    // Trigger particle burst
    const linePosition = effect.lineNumber === 1 ? 0.25 : effect.lineNumber === 2 ? 0.5 : 0.75;
    
    confetti({
      particleCount: isHeavy ? 50 : isMedium ? 40 : 30,
      spread: isHeavy ? 80 : 60,
      origin: { x: 0.5, y: linePosition },
      colors: particleColors,
      startVelocity: isHeavy ? 40 : 30,
      gravity: 1.5,
      scalar: isHeavy ? 1.2 : 0.8,
    });

    // Complete after animation
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [effect, onComplete, isHeavy, isMedium, particleColors]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, x: '-50%', y: 0 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 1, 0.8],
        y: [-50, -100, -150, -200],
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      className="fixed left-1/2 pointer-events-none z-50"
      style={{
        top: `${effect.lineNumber * 25}%`,
      }}
    >
      <div className="flex flex-col items-center gap-2">
          {/* Explosion effect */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, isHeavy ? 3 : 2, isHeavy ? 4 : 3] }}
            transition={{ duration: 0.6 }}
            className={`absolute inset-0 rounded-full blur-xl ${
              isHeavy ? 'bg-red-500/40' : isMedium ? 'bg-orange-500/30' : 'bg-white/20'
            }`}
            style={{ 
              width: isHeavy ? '120px' : '100px', 
              height: isHeavy ? '120px' : '100px', 
              left: isHeavy ? '-60px' : '-50px', 
              top: isHeavy ? '-60px' : '-50px' 
            }}
          />
          
          {/* Damage number */}
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ 
              scale: [0.5, isHeavy ? 1.5 : 1.3, 1],
              rotate: [-10, 5, 0],
            }}
            transition={{ duration: 0.5 }}
            className={`relative font-black ${damageColor} ${
              isHeavy ? 'text-7xl' : 'text-6xl'
            }`}
            style={{
              textShadow: isHeavy 
                ? '0 0 30px rgba(239,68,68,1), 0 0 60px rgba(239,68,68,0.8), 0 0 90px rgba(239,68,68,0.6)' 
                : isMedium
                ? '0 0 20px rgba(251,191,36,1), 0 0 40px rgba(251,191,36,0.8)'
                : '0 0 10px rgba(255,255,255,0.8)',
              filter: isHeavy ? 'drop-shadow(0 0 20px rgba(239,68,68,1))' : 'none'
            }}
          >
            -{effect.damage}
          </motion.div>
          
          {/* Critical indicator */}
          {isCritical && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                y: [20, 0, -10, -20],
                scale: [0.5, 1.2, 1, 0.8]
              }}
              transition={{ duration: 1.2 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 text-red-400 font-black text-xl"
              style={{
                textShadow: '0 0 10px rgba(248,113,113,1), 0 0 20px rgba(248,113,113,0.8)'
              }}
            >
              CRÍTICO!
            </motion.div>
          )}
        </div>

        {/* Attack indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-bold text-orange-400 uppercase tracking-wider"
        >
          💥 ATAQUE!
        </motion.div>
      </div>
    </motion.div>
  );
};

// Card play effect
interface CardPlayEffectProps {
  cardName: string;
  lineNumber: number;
  onComplete: () => void;
}

export const CardPlayEffect = ({ cardName, lineNumber, onComplete }: CardPlayEffectProps) => {
  useEffect(() => {
    // Flash effect
    confetti({
      particleCount: 15,
      spread: 40,
      origin: { x: 0.5, y: 0.7 },
      colors: ['#3b82f6', '#8b5cf6', '#ec4899'],
      startVelocity: 20,
      gravity: 0.8,
      scalar: 0.6,
    });

    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 100 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0.8, 1.1, 1],
        y: [100, 50, 0],
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="fixed left-1/2 -translate-x-1/2 pointer-events-none z-50"
      style={{
        top: `${30 + lineNumber * 15}%`,
      }}
    >
      <div className="px-6 py-3 bg-primary/90 border-2 border-primary rounded-lg backdrop-blur-sm">
        <p className="text-sm font-bold text-primary-foreground">
          ✨ {cardName} jogado na Linha {lineNumber}!
        </p>
      </div>
    </motion.div>
  );
};

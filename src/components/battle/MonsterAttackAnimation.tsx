import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Zap } from 'lucide-react';

interface AttackData {
  attackerName: string;
  attackerImage?: string;
  attackerAtk: number;
  defenderName: string;
  defenderImage?: string;
  damage: number;
  isCritical?: boolean;
}

interface MonsterAttackAnimationProps {
  isVisible: boolean;
  attackData: AttackData | null;
  onComplete?: () => void;
}

export const MonsterAttackAnimation = ({
  isVisible,
  attackData,
  onComplete,
}: MonsterAttackAnimationProps) => {
  if (!attackData) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={(definition) => {
            if (definition === 'exit' && onComplete) {
              onComplete();
            }
          }}
        >
          {/* Dark backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Attack sequence container */}
          <div className="relative w-full h-full flex items-center justify-center">
            
            {/* Attacker card - jumps to center then dashes forward */}
            <motion.div
              className="absolute z-20"
              initial={{ 
                y: 200, 
                scale: 0.3, 
                opacity: 0,
                x: 0 
              }}
              animate={{ 
                y: [200, 0, -150, 200],
                scale: [0.3, 1, 1.2, 0.3],
                opacity: [0, 1, 1, 0],
                x: 0
              }}
              transition={{
                duration: 1.5,
                times: [0, 0.3, 0.6, 1],
                ease: 'easeInOut'
              }}
            >
              {/* Card visual */}
              <div className="relative w-32 h-44 md:w-40 md:h-56 rounded-xl overflow-hidden shadow-2xl border-2 border-red-500/50">
                {/* Card glow */}
                <motion.div
                  className="absolute -inset-2 bg-gradient-to-r from-red-500/40 via-orange-500/40 to-red-500/40 rounded-xl blur-xl"
                  animate={{ 
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 0.5, repeat: 2 }}
                />
                
                {/* Card background */}
                <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-gray-800">
                  {attackData.attackerImage ? (
                    <img 
                      src={attackData.attackerImage} 
                      alt={attackData.attackerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Swords className="w-12 h-12 text-red-500" />
                    </div>
                  )}
                  
                  {/* ATK badge */}
                  <div className="absolute bottom-2 right-2 bg-red-600/90 px-2 py-1 rounded text-white text-xs font-bold">
                    ATK {attackData.attackerAtk}
                  </div>
                </div>
              </div>

              {/* Attack name label */}
              <motion.div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="text-sm font-bold text-white bg-black/80 px-3 py-1 rounded-full">
                  {attackData.attackerName}
                </span>
              </motion.div>
            </motion.div>

            {/* Slash effect - appears at impact point */}
            <motion.div
              className="absolute z-30"
              style={{ top: '25%' }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.5, 2, 2.5],
                rotate: [0, -15, 15, 0]
              }}
              transition={{ 
                duration: 0.6, 
                delay: 0.9,
                times: [0, 0.2, 0.5, 1]
              }}
            >
              {/* Slash lines */}
              <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-2xl">
                <motion.path
                  d="M 20 100 Q 100 80 180 100"
                  stroke="url(#slashGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.4, delay: 0.9 }}
                />
                <motion.path
                  d="M 30 70 Q 100 100 170 70"
                  stroke="url(#slashGradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.3, delay: 0.95 }}
                />
                <motion.path
                  d="M 40 130 Q 100 110 160 130"
                  stroke="url(#slashGradient)"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.35, delay: 1 }}
                />
                <defs>
                  <linearGradient id="slashGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            {/* Impact sparks */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute z-25 w-3 h-3 rounded-full bg-yellow-400"
                style={{ 
                  top: '25%',
                  left: '50%',
                  boxShadow: '0 0 10px #fbbf24, 0 0 20px #f59e0b'
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: Math.cos(i * 45 * Math.PI / 180) * 100,
                  y: Math.sin(i * 45 * Math.PI / 180) * 100 - 50,
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0]
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.95 + (i * 0.03),
                  ease: 'easeOut'
                }}
              />
            ))}

            {/* Floating damage number */}
            <motion.div
              className="absolute z-40"
              style={{ top: '20%' }}
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.5, 1.3, 1],
                y: [0, -30, -50, -80]
              }}
              transition={{ 
                duration: 1.2, 
                delay: 1,
                times: [0, 0.2, 0.6, 1]
              }}
            >
              <div 
                className={`text-5xl md:text-7xl font-black ${
                  attackData.isCritical ? 'text-yellow-400' : 'text-red-500'
                }`}
                style={{
                  textShadow: attackData.isCritical 
                    ? '0 0 20px #fbbf24, 0 0 40px #f59e0b, 2px 2px 0 #000'
                    : '0 0 20px #ef4444, 0 0 40px #dc2626, 2px 2px 0 #000',
                  WebkitTextStroke: '2px #000'
                }}
              >
                -{attackData.damage}
              </div>
              {attackData.isCritical && (
                <motion.div
                  className="text-center text-yellow-300 text-sm font-bold mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.8, delay: 1.1 }}
                >
                  CRÍTICO!
                </motion.div>
              )}
            </motion.div>

            {/* Speed lines background effect */}
            <motion.div
              className="absolute inset-0 z-10 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-px bg-gradient-to-r from-transparent via-white to-transparent"
                  style={{
                    top: `${10 + i * 4}%`,
                    left: '-100%',
                    width: '200%',
                    transform: `rotate(${-5 + Math.random() * 10}deg)`
                  }}
                  initial={{ x: '-50%' }}
                  animate={{ x: '50%' }}
                  transition={{
                    duration: 0.3,
                    delay: 0.7 + (i * 0.02),
                    ease: 'linear'
                  }}
                />
              ))}
            </motion.div>

            {/* "ATTACK!" text flash */}
            <motion.div
              className="absolute z-35 top-[10%]"
              initial={{ opacity: 0, scale: 2, rotate: -10 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [2, 1, 1.1, 0.8],
                rotate: [-10, 0, 2, 0]
              }}
              transition={{ 
                duration: 0.8, 
                delay: 0.4,
                times: [0, 0.3, 0.7, 1]
              }}
            >
              <span 
                className="text-4xl md:text-6xl font-black text-white tracking-wider"
                style={{
                  textShadow: '0 0 30px #ef4444, 0 0 60px #dc2626, 3px 3px 0 #000',
                  WebkitTextStroke: '2px #7f1d1d'
                }}
              >
                ATAQUE!
              </span>
            </motion.div>

            {/* Impact flash */}
            <motion.div
              className="absolute inset-0 z-50 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 0.15, delay: 0.9 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

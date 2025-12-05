import { motion, AnimatePresence } from 'framer-motion';
import { Skull } from 'lucide-react';

interface DefeatedCardEffectProps {
  isVisible: boolean;
  cardName: string;
  cardImage?: string;
  accentColor?: 'red' | 'blue';
  onComplete?: () => void;
}

// Generate random fragment positions
const generateFragments = (count: number) => {
  return [...Array(count)].map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 300,
    y: (Math.random() - 0.5) * 300 - 100,
    rotation: Math.random() * 720 - 360,
    scale: 0.3 + Math.random() * 0.7,
    delay: Math.random() * 0.2,
  }));
};

const fragments = generateFragments(12);

export const DefeatedCardEffect = ({
  isVisible,
  cardName,
  cardImage,
  accentColor = 'red',
  onComplete,
}: DefeatedCardEffectProps) => {
  const colorClass = accentColor === 'red' ? 'red' : 'blue';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={(definition) => {
            if (definition === 'exit' && onComplete) {
              onComplete();
            }
          }}
        >
          {/* Dark flash backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.6] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* Main card shattering effect */}
          <div className="relative">
            {/* Card being destroyed */}
            <motion.div
              className="relative w-32 h-44 md:w-40 md:h-56"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ 
                scale: [1, 1.1, 0],
                opacity: [1, 1, 0],
                filter: ['brightness(1)', 'brightness(2)', 'brightness(3)']
              }}
              transition={{ duration: 0.6, times: [0, 0.3, 1] }}
            >
              {/* Crack overlay */}
              <motion.svg
                className="absolute inset-0 w-full h-full z-10"
                viewBox="0 0 100 140"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1] }}
                transition={{ duration: 0.3 }}
              >
                {/* Crack lines */}
                <motion.path
                  d="M 50 0 L 45 40 L 30 60 L 40 100 L 50 140"
                  stroke={`var(--${colorClass}-500)`}
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.path
                  d="M 50 0 L 55 30 L 70 50 L 60 90 L 50 140"
                  stroke={`var(--${colorClass}-400)`}
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                />
                <motion.path
                  d="M 0 70 L 30 65 L 50 70 L 70 75 L 100 70"
                  stroke={`var(--${colorClass}-500)`}
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                />
                <motion.path
                  d="M 20 30 L 40 40 L 60 35 L 80 45"
                  stroke={`var(--${colorClass}-400)`}
                  strokeWidth="1.5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                />
                <motion.path
                  d="M 15 100 L 35 95 L 55 105 L 75 95 L 90 100"
                  stroke={`var(--${colorClass}-500)`}
                  strokeWidth="1.5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                />
              </motion.svg>

              {/* Card content */}
              <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-red-500/50 bg-gradient-to-br from-gray-900 to-gray-800">
                {cardImage ? (
                  <img 
                    src={cardImage} 
                    alt={cardName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Skull className="w-12 h-12 text-red-500" />
                  </div>
                )}
              </div>

              {/* Glow effect intensifying */}
              <motion.div
                className={`absolute -inset-4 rounded-xl bg-${colorClass}-500/50 blur-2xl`}
                animate={{ 
                  opacity: [0.3, 0.8, 0],
                  scale: [1, 1.5, 2]
                }}
                transition={{ duration: 0.6 }}
              />
            </motion.div>

            {/* Shatter fragments */}
            {fragments.map((frag) => (
              <motion.div
                key={frag.id}
                className={`absolute w-6 h-8 rounded bg-gradient-to-br from-gray-700 to-gray-900 border border-${colorClass}-500/50`}
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: -12,
                  marginTop: -16,
                }}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  rotate: 0, 
                  scale: 0,
                  opacity: 0 
                }}
                animate={{ 
                  x: frag.x,
                  y: frag.y,
                  rotate: frag.rotation,
                  scale: [0, frag.scale, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{ 
                  duration: 0.8,
                  delay: 0.3 + frag.delay,
                  ease: 'easeOut'
                }}
              />
            ))}

            {/* Explosion particles */}
            {[...Array(16)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                className={`absolute w-2 h-2 rounded-full ${
                  i % 2 === 0 ? `bg-${colorClass}-400` : 'bg-orange-400'
                }`}
                style={{
                  left: '50%',
                  top: '50%',
                  boxShadow: `0 0 10px ${i % 2 === 0 ? '#ef4444' : '#f97316'}`
                }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{
                  x: Math.cos(i * 22.5 * Math.PI / 180) * (80 + Math.random() * 60),
                  y: Math.sin(i * 22.5 * Math.PI / 180) * (80 + Math.random() * 60),
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.25 + (i * 0.02),
                  ease: 'easeOut'
                }}
              />
            ))}

            {/* "DESTRUÍDO!" text */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap z-20"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.3, 1],
                opacity: [0, 1, 1, 0]
              }}
              transition={{ 
                duration: 1,
                delay: 0.4,
                times: [0, 0.3, 0.6, 1]
              }}
            >
              <span 
                className="text-3xl md:text-5xl font-black text-red-500"
                style={{
                  textShadow: '0 0 20px #ef4444, 0 0 40px #dc2626, 2px 2px 0 #000',
                  WebkitTextStroke: '1px #7f1d1d'
                }}
              >
                DESTRUÍDO!
              </span>
            </motion.div>

            {/* Card name below */}
            <motion.div
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: [0, 1, 1, 0], y: 0 }}
              transition={{ duration: 1.2, delay: 0.5 }}
            >
              <span className="text-sm font-bold text-white bg-black/80 px-4 py-2 rounded-full border border-red-500/30">
                {cardName}
              </span>
            </motion.div>
          </div>

          {/* Screen red flash */}
          <motion.div
            className="absolute inset-0 bg-red-500/30 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.2, delay: 0.25 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

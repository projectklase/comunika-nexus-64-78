import { motion } from 'framer-motion';
import { CardEffect } from '@/types/cards';

interface CardEffectOverlayProps {
  effects: CardEffect[];
}

export const CardEffectOverlay = ({ effects }: CardEffectOverlayProps) => {
  if (!effects || effects.length === 0) return null;

  return (
    <>
      {effects.map((effect, idx) => (
        <div key={idx}>
          {effect.type === 'BURN' && (
            <>
              {/* Animated flames */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`flame-${i}`}
                  className="absolute w-3 h-4 rounded-full"
                  style={{
                    background: 'linear-gradient(to top, #ef4444, #fb923c, #fbbf24)',
                    left: `${15 + i * 15}%`,
                    bottom: '-4px'
                  }}
                  animate={{
                    y: [0, -20, -30],
                    opacity: [1, 0.8, 0],
                    scale: [0.8, 1, 0.5]
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.1,
                    repeat: Infinity,
                    ease: 'easeOut'
                  }}
                />
              ))}
              {/* Fire border glow */}
              <div className="absolute inset-0 rounded-lg border-2 border-orange-500 animate-fire-flicker pointer-events-none" />
            </>
          )}

          {effect.type === 'SHIELD' && (
            <>
              {/* Hexagonal shield pattern */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity
                }}
              >
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {[...Array(3)].map((_, i) => (
                    <motion.polygon
                      key={i}
                      points="50,15 85,30 85,60 50,75 15,60 15,30"
                      fill="none"
                      stroke="rgba(59, 130, 246, 0.4)"
                      strokeWidth="2"
                      initial={{ scale: 0.8 + i * 0.1 }}
                      animate={{ 
                        scale: [0.8 + i * 0.1, 1 + i * 0.1, 0.8 + i * 0.1],
                        opacity: [0.6, 1, 0.6]
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.3,
                        repeat: Infinity
                      }}
                    />
                  ))}
                </svg>
              </motion.div>
              {/* Blue glow */}
              <div className="absolute inset-0 rounded-lg bg-blue-500/20 animate-shield-pulse pointer-events-none" />
            </>
          )}

          {effect.type === 'BOOST' && (
            <>
              {/* Rising arrows */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`arrow-${i}`}
                  className="absolute text-green-400 text-2xl font-bold"
                  style={{
                    left: `${30 + i * 20}%`,
                    top: '50%'
                  }}
                  animate={{
                    y: [0, -40, -60],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.2,
                    repeat: Infinity
                  }}
                >
                  ↑
                </motion.div>
              ))}
              {/* Power-up glow */}
              <motion.div
                className="absolute inset-0 rounded-lg bg-green-500/20 pointer-events-none"
                animate={{
                  opacity: [0.2, 0.5, 0.2]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity
                }}
              />
            </>
          )}

          {effect.type === 'HEAL' && (
            <>
              {/* Floating hearts */}
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={`heart-${i}`}
                  className="absolute text-green-400 text-xl"
                  style={{
                    left: `${20 + i * 20}%`,
                    bottom: '10%'
                  }}
                  animate={{
                    y: [0, -30, -50],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.8]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.3,
                    repeat: Infinity
                  }}
                >
                  ♥
                </motion.div>
              ))}
              {/* Soft green glow */}
              <div className="absolute inset-0 rounded-lg bg-green-400/15 blur-md pointer-events-none" />
            </>
          )}

          {effect.type === 'FREEZE' && (
            <>
              {/* Ice crystals */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={`ice-${i}`}
                  className="absolute text-cyan-300 text-lg"
                  style={{
                    left: `${10 + i * 20}%`,
                    top: `${20 + (i % 3) * 20}%`
                  }}
                  animate={{
                    rotate: [0, 360],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{
                    duration: 3,
                    delay: i * 0.2,
                    repeat: Infinity
                  }}
                >
                  ❄
                </motion.div>
              ))}
              {/* Frost overlay */}
              <div className="absolute inset-0 rounded-lg bg-cyan-400/20 animate-ice-shimmer pointer-events-none" />
            </>
          )}

          {effect.type === 'DOUBLE' && (
            <>
              {/* Mirror effect */}
              <motion.div
                className="absolute inset-0 rounded-lg border-2 border-yellow-400 pointer-events-none"
                animate={{
                  x: [0, 3, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-lg border-2 border-yellow-400 pointer-events-none"
                animate={{
                  x: [0, -3, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity
                }}
              />
              {/* Duplication indicator */}
              <motion.div
                className="absolute top-2 right-2 text-yellow-400 font-black text-sm"
                animate={{
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity
                }}
              >
                x2
              </motion.div>
            </>
          )}
        </div>
      ))}
    </>
  );
};

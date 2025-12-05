import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles } from 'lucide-react';

interface TrapActivationOverlayProps {
  isVisible: boolean;
  trapName: string;
  trapDescription: string;
  trapImage?: string;
  onComplete?: () => void;
}

export const TrapActivationOverlay = ({
  isVisible,
  trapName,
  trapDescription,
  trapImage,
  onComplete,
}: TrapActivationOverlayProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={(definition) => {
            if (definition === 'exit' && onComplete) {
              onComplete();
            }
          }}
        >
          {/* Dark backdrop with radial glow */}
          <motion.div
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Animated energy rings */}
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full border-2 border-purple-500/30"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 2], 
              opacity: [0.8, 0.4, 0] 
            }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full border-2 border-indigo-500/40"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 1.6], 
              opacity: [0.8, 0.5, 0] 
            }}
            transition={{ duration: 1.2, delay: 0.1, ease: 'easeOut' }}
          />

          {/* Main card container with flip animation */}
          <motion.div
            className="relative"
            initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
            animate={{ rotateY: 0, scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ 
              duration: 0.6, 
              type: 'spring', 
              stiffness: 100,
              damping: 15 
            }}
            style={{ perspective: 1000 }}
          >
            {/* Glowing background effect */}
            <motion.div
              className="absolute -inset-8 bg-gradient-to-r from-purple-600/40 via-indigo-500/40 to-purple-600/40 rounded-3xl blur-2xl"
              animate={{ 
                opacity: [0.5, 0.8, 0.5],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />

            {/* Trap card visual */}
            <div className="relative bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 rounded-2xl p-6 border-2 border-purple-400/50 shadow-2xl min-w-[320px] max-w-[400px]">
              {/* Trap Card Image */}
              {trapImage ? (
                <motion.div
                  className="relative w-28 h-36 mx-auto mb-4 rounded-lg overflow-hidden border-2 border-purple-400/50 shadow-xl"
                  initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
                  animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.5, type: 'spring' }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <img 
                    src={trapImage} 
                    alt={trapName}
                    className="w-full h-full object-cover"
                  />
                  {/* Glow effect on card */}
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/40 to-transparent" />
                </motion.div>
              ) : (
                <motion.div
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/30 flex items-center justify-center border-2 border-purple-400/50"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                  transition={{ delay: 0.15, type: 'spring' }}
                >
                  <Shield className="w-10 h-10 text-purple-300" />
                </motion.div>
              )}
              {/* Top decorative border */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              />

              {/* TRAP label */}
              <motion.div
                className="flex items-center justify-center gap-2 mb-4"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Shield className="w-5 h-5 text-purple-300" />
                <span className="text-xs font-bold tracking-[0.3em] text-purple-300 uppercase">
                  Trap Ativada
                </span>
                <Shield className="w-5 h-5 text-purple-300" />
              </motion.div>

              {/* Trap name with glow effect */}
              <motion.h2
                className="text-2xl md:text-3xl font-bold text-center mb-4 text-white"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                style={{
                  textShadow: '0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.4)',
                }}
              >
                {trapName}
              </motion.h2>

              {/* Decorative divider */}
              <motion.div
                className="flex items-center gap-3 my-4"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-purple-400/50" />
                <Sparkles className="w-4 h-4 text-purple-400" />
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-purple-400/50" />
              </motion.div>

              {/* Trap effect description */}
              <motion.p
                className="text-center text-purple-100/90 text-sm md:text-base leading-relaxed"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {trapDescription}
              </motion.p>

              {/* Bottom sparkle particles */}
              <motion.div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <motion.div
                  className="flex gap-2"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-purple-400"
                      animate={{ 
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        delay: i * 0.2 
                      }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* Floating particles around the card */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-purple-400/60"
              initial={{ 
                x: 0, 
                y: 0, 
                opacity: 0,
                scale: 0 
              }}
              animate={{ 
                x: Math.cos(i * 30 * Math.PI / 180) * 200,
                y: Math.sin(i * 30 * Math.PI / 180) * 200,
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{ 
                duration: 1.5,
                delay: 0.3 + (i * 0.05),
                ease: 'easeOut'
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

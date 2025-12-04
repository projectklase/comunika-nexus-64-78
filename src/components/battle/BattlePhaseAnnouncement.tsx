import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

interface BattlePhaseAnnouncementProps {
  isVisible: boolean;
  phase: 'SETUP' | 'BATTLE';
  onAnimationComplete?: () => void;
}

export const BattlePhaseAnnouncement = ({ 
  isVisible, 
  phase,
  onAnimationComplete 
}: BattlePhaseAnnouncementProps) => {
  if (phase !== 'SETUP') return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Dark overlay */}
          <motion.div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Main announcement container */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.2, opacity: 0, y: -50 }}
            transition={{ 
              type: "spring", 
              damping: 15, 
              stiffness: 200,
              duration: 0.8 
            }}
            onAnimationComplete={onAnimationComplete}
          >
            {/* Outer glow ring */}
            <motion.div
              className="absolute -inset-20 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(234,179,8,0.3) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Shield icon */}
            <motion.div
              className="mb-4"
              animate={{ 
                y: [0, -10, 0],
                rotateY: [0, 180, 360],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Shield className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]" />
            </motion.div>

            {/* Main text container with border */}
            <motion.div
              className="relative px-12 py-6 rounded-lg border-4 border-yellow-500/80"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,20,0,0.95) 100%)',
                boxShadow: '0 0 40px rgba(234,179,8,0.5), inset 0 0 30px rgba(234,179,8,0.1)',
              }}
            >
              {/* Animated border glow */}
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{
                  boxShadow: '0 0 20px rgba(234,179,8,0.8)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(234,179,8,0.5)',
                    '0 0 40px rgba(234,179,8,0.8)',
                    '0 0 20px rgba(234,179,8,0.5)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />

              {/* Main title */}
              <motion.h1
                className="text-4xl md:text-5xl font-black tracking-wider text-center"
                style={{
                  background: 'linear-gradient(180deg, #fef08a 0%, #eab308 50%, #ca8a04 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 30px rgba(234,179,8,0.5)',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                }}
                animate={{
                  textShadow: [
                    '0 0 20px rgba(234,179,8,0.5)',
                    '0 0 40px rgba(234,179,8,0.8)',
                    '0 0 20px rgba(234,179,8,0.5)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                FASE DE PREPARAÇÃO
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="mt-3 text-sm md:text-base text-yellow-200/80 text-center font-medium"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                ⚔️ Prepare suas defesas! Ataques bloqueados neste turno ⚔️
              </motion.p>
            </motion.div>

            {/* Decorative lines */}
            <div className="absolute left-1/2 -translate-x-1/2 w-[300px] flex items-center gap-2 -top-4">
              <motion.div 
                className="flex-1 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-full"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 w-[300px] flex items-center gap-2 -bottom-4">
              <motion.div 
                className="flex-1 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-full"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

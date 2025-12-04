import { motion, AnimatePresence } from 'framer-motion';
import { Swords } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BattleDuelStartProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const BattleDuelStart = ({ isVisible, onComplete }: BattleDuelStartProps) => {
  const [showAnnouncement, setShowAnnouncement] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShowAnnouncement(true);
      const timer = setTimeout(() => {
        setShowAnnouncement(false);
        onComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {showAnnouncement && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark background */}
          <motion.div 
            className="absolute inset-0 bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Particle effects */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  y: [0, -100],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity,
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 12, 
              stiffness: 150 
            }}
          >
            {/* Radial glow */}
            <motion.div
              className="absolute -inset-32 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(234,179,8,0.4) 0%, transparent 60%)',
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />

            {/* Crossed swords icon */}
            <motion.div
              className="mb-6"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <Swords className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_30px_rgba(234,179,8,1)]" />
            </motion.div>

            {/* Main text */}
            <motion.div
              className="relative"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.h1
                className="text-5xl md:text-7xl font-black tracking-widest text-center"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #fef08a 30%, #eab308 70%, #ca8a04 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(234,179,8,0.8)) drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                }}
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                DUELO
              </motion.h1>
              
              <motion.h1
                className="text-5xl md:text-7xl font-black tracking-widest text-center -mt-2"
                style={{
                  background: 'linear-gradient(180deg, #fef08a 0%, #eab308 50%, #ca8a04 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(234,179,8,0.8)) drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                }}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1, scale: [1, 1.05, 1] }}
                transition={{ delay: 0.4, duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
              >
                INICIADO!
              </motion.h1>
            </motion.div>

            {/* Horizontal line decorations */}
            <motion.div
              className="mt-6 flex items-center gap-4"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <div className="w-24 h-1 bg-gradient-to-r from-transparent to-yellow-500 rounded-full" />
              <div className="w-3 h-3 bg-yellow-400 rotate-45" />
              <div className="w-24 h-1 bg-gradient-to-l from-transparent to-yellow-500 rounded-full" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

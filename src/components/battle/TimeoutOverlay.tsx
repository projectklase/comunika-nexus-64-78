import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from 'lucide-react';

interface TimeoutOverlayProps {
  isVisible: boolean;
  nextPlayerName: string;
}

export const TimeoutOverlay = ({ isVisible, nextPlayerName }: TimeoutOverlayProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="relative bg-gradient-to-br from-destructive/20 via-background to-destructive/10 rounded-2xl border-2 border-destructive/50 p-8 shadow-2xl max-w-md mx-4"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Animated ring effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-destructive/30"
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            
            {/* Timer icon with pulse */}
            <motion.div 
              className="mx-auto w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <Timer className="w-10 h-10 text-destructive" />
            </motion.div>
            
            {/* Title */}
            <motion.h2 
              className="text-3xl font-bold text-destructive text-center mb-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              ⏰ TEMPO ESGOTADO!
            </motion.h2>
            
            {/* Subtitle */}
            <motion.p 
              className="text-lg text-foreground/80 text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Turno passou para <span className="font-bold text-primary">{nextPlayerName}</span>
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

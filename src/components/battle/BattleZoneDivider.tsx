import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';

export const BattleZoneDivider = () => {
  return (
    <div className="relative flex items-center justify-center py-6">
      {/* Background energy lines */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
      
      {/* Animated energy pulse */}
      <motion.div
        className="absolute inset-0 flex items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      </motion.div>

      {/* Center badge */}
      <motion.div 
        className="relative z-10"
        animate={{ 
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {/* Outer glow */}
        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl" />
        
        {/* Inner container */}
        <div className="relative flex flex-col items-center gap-2 px-8 py-4 bg-background/80 backdrop-blur-md rounded-2xl border border-primary/30 shadow-lg">
          {/* Crossed swords icon */}
          <div className="relative">
            {/* Icon glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-10 h-10 bg-primary/30 rounded-full blur-md"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Swords className="w-8 h-8 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
            </motion.div>
          </div>
          
          {/* Text */}
          <div className="flex flex-col items-center">
            <motion.span 
              className="text-sm font-bold tracking-[0.2em] text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ZONA DE BATALHA
            </motion.span>
            <span className="text-[10px] text-muted-foreground/60 tracking-wider">
              COMBAT ZONE
            </span>
          </div>
        </div>

        {/* Side decorations */}
        <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 flex items-center gap-1 pr-2">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`left-${i}`}
              className="w-1.5 h-1.5 rounded-full bg-blue-400/60"
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <div className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 flex items-center gap-1 pl-2">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`right-${i}`}
              className="w-1.5 h-1.5 rounded-full bg-red-400/60"
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

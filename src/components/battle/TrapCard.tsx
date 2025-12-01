import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface TrapCardProps {
  isFacedown?: boolean;
  trapName?: string;
  onActivate?: () => void;
}

export const TrapCard = ({ isFacedown = true, trapName, onActivate }: TrapCardProps) => {
  if (isFacedown) {
    return (
      <motion.div
        className="relative w-20 h-28 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-lg border-2 border-purple-500/50 shadow-lg cursor-pointer"
        whileHover={{ scale: 1.05, rotateY: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={onActivate}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <AlertTriangle className="w-12 h-12 text-purple-300" />
          </motion.div>
        </div>
        
        {/* Mysterious glow effect */}
        <motion.div
          className="absolute inset-0 bg-purple-500/20 rounded-lg"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
      </motion.div>
    );
  }

  // Face-up trap (activated)
  return (
    <motion.div
      className="relative w-20 h-28 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg border-2 border-purple-400 shadow-xl"
      initial={{ rotateY: 180, scale: 0.8 }}
      animate={{ rotateY: 0, scale: 1 }}
      transition={{ duration: 0.6, type: 'spring' }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
        <AlertTriangle className="w-8 h-8 text-white mb-1" />
        <span className="text-[10px] font-bold text-white text-center leading-tight">
          {trapName}
        </span>
      </div>
      
      {/* Activation glow */}
      <motion.div
        className="absolute inset-0 bg-yellow-500/40 rounded-lg"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1 }}
      />
    </motion.div>
  );
};

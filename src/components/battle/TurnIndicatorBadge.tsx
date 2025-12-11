import { motion } from 'framer-motion';

interface TurnIndicatorBadgeProps {
  isMyTurn: boolean;
}

export const TurnIndicatorBadge = ({ isMyTurn }: TurnIndicatorBadgeProps) => {
  return (
    <motion.div
      className="fixed top-4 right-4 z-[55]"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full
          backdrop-blur-md border shadow-lg
          ${isMyTurn 
            ? 'bg-emerald-500/20 border-emerald-500/50 shadow-emerald-500/20' 
            : 'bg-red-500/20 border-red-500/50 shadow-red-500/20'
          }
        `}
        animate={isMyTurn ? {
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 0 10px rgba(16, 185, 129, 0.2)',
            '0 0 20px rgba(16, 185, 129, 0.4)',
            '0 0 10px rgba(16, 185, 129, 0.2)',
          ]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {/* Indicator dot */}
        <motion.div
          className={`w-2.5 h-2.5 rounded-full ${
            isMyTurn ? 'bg-emerald-400' : 'bg-red-400'
          }`}
          animate={isMyTurn ? {
            scale: [1, 1.3, 1],
            opacity: [1, 0.7, 1]
          } : {
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        
        {/* Text */}
        <span className={`text-xs font-semibold ${
          isMyTurn ? 'text-emerald-300' : 'text-red-300'
        }`}>
          {isMyTurn ? 'Seu turno' : 'Oponente'}
        </span>
      </motion.div>
    </motion.div>
  );
};

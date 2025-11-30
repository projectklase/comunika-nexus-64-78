import { motion } from 'framer-motion';
import { Swords, Clock } from 'lucide-react';

interface BattleTurnIndicatorProps {
  isMyTurn: boolean;
}

export const BattleTurnIndicator = ({ isMyTurn }: BattleTurnIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto"
    >
      <motion.div
        animate={{
          scale: isMyTurn ? [1, 1.05, 1] : 1,
          boxShadow: isMyTurn 
            ? [
                '0 0 0 0 rgba(var(--primary-rgb), 0)',
                '0 0 0 8px rgba(var(--primary-rgb), 0.3)',
                '0 0 0 0 rgba(var(--primary-rgb), 0)',
              ]
            : '0 0 0 0 rgba(0, 0, 0, 0)',
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`p-4 rounded-xl border-2 ${
          isMyTurn
            ? 'bg-primary/20 border-primary backdrop-blur-sm'
            : 'bg-muted/50 border-border backdrop-blur-sm'
        }`}
      >
        <div className="flex items-center justify-center gap-3">
          {isMyTurn ? (
            <>
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Swords className="w-6 h-6 text-primary" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">É SUA VEZ!</p>
                <p className="text-xs text-primary/70">Selecione uma carta e uma linha</p>
              </div>
              <motion.div
                animate={{ rotate: [0, -360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Swords className="w-6 h-6 text-primary" />
              </motion.div>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Clock className="w-5 h-5 text-muted-foreground" />
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Aguardando oponente...
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

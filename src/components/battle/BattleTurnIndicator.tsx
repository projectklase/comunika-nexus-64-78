import { motion } from 'framer-motion';
import { Swords, Clock, Zap } from 'lucide-react';

interface BattleTurnIndicatorProps {
  isMyTurn: boolean;
}

export const BattleTurnIndicator = ({ isMyTurn }: BattleTurnIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto"
    >
      <motion.div
        animate={{
          scale: isMyTurn ? [1, 1.02, 1] : 1,
          boxShadow: isMyTurn 
            ? [
                '0 0 0 0 rgba(var(--primary-rgb), 0)',
                '0 0 20px 4px rgba(var(--primary-rgb), 0.4)',
                '0 0 0 0 rgba(var(--primary-rgb), 0)',
              ]
            : 'none',
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`
          relative overflow-hidden rounded-2xl p-4 lg:p-6
          ${isMyTurn
            ? 'bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 border-2 border-primary backdrop-blur-sm'
            : 'bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border border-border/50 backdrop-blur-sm'
          }
        `}
      >
        {/* Animated background effect for my turn */}
        {isMyTurn && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            animate={{
              x: ['-100%', '200%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear'
            }}
          />
        )}

        <div className="relative flex items-center justify-center gap-3 lg:gap-4">
          {isMyTurn ? (
            <>
              {/* Left sword */}
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="bg-primary/20 rounded-full p-2 lg:p-3 border-2 border-primary">
                  <Swords className="w-5 h-5 lg:w-7 lg:h-7 text-primary" />
                </div>
              </motion.div>

              {/* Center content */}
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-2 mb-1"
                >
                  <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                  <p className="text-xl lg:text-3xl font-black text-primary tracking-wide">
                    É SUA VEZ!
                  </p>
                  <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                </motion.div>
                <p className="text-xs lg:text-sm text-primary/90 font-semibold">
                  Selecione uma carta e escolha uma linha
                </p>
              </div>

              {/* Right sword */}
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <div className="bg-primary/20 rounded-full p-2 lg:p-3 border-2 border-primary">
                  <Swords className="w-5 h-5 lg:w-7 lg:h-7 text-primary" />
                </div>
              </motion.div>
            </>
          ) : (
            <>
              {/* Clock icon */}
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <div className="bg-muted rounded-full p-2 lg:p-3 border border-border">
                  <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
                </div>
              </motion.div>

              {/* Center content */}
              <div className="text-center">
                <p className="text-base lg:text-xl font-bold text-muted-foreground">
                  Aguardando Oponente...
                </p>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center justify-center gap-1 mt-1"
                >
                  <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-muted-foreground/50 rounded-full" />
                  <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-muted-foreground/50 rounded-full" />
                  <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-muted-foreground/50 rounded-full" />
                </motion.div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

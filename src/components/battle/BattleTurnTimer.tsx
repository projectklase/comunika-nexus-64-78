import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, Zap } from 'lucide-react';

interface BattleTurnTimerProps {
  isMyTurn: boolean;
  turnStartedAt: string | null;
  maxSeconds?: number;
  onTimeout?: () => void;
  isPaused?: boolean;
}

export const BattleTurnTimer = ({ 
  isMyTurn, 
  turnStartedAt,
  maxSeconds = 15,
  onTimeout,
  isPaused = false
}: BattleTurnTimerProps) => {
  const [remainingSeconds, setRemainingSeconds] = useState(maxSeconds);
  const timeoutCalledRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!turnStartedAt) {
      setRemainingSeconds(maxSeconds);
      return;
    }

    // If paused, don't run timer
    if (isPaused) {
      setRemainingSeconds(maxSeconds);
      return;
    }

    timeoutCalledRef.current = false;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(turnStartedAt).getTime()) / 1000);
      const remaining = Math.max(0, maxSeconds - elapsed);
      setRemainingSeconds(remaining);

      if (remaining === 0 && !timeoutCalledRef.current) {
        timeoutCalledRef.current = true;
        clearInterval(interval);
        onTimeoutRef.current?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [turnStartedAt, maxSeconds, isPaused]);

  const progress = (remainingSeconds / maxSeconds) * 100;
  const isUrgent = remainingSeconds <= 5;
  const isExpired = remainingSeconds === 0;

  // Color based on time remaining
  const getTimerColor = () => {
    if (isExpired) return 'from-red-600 to-red-800';
    if (isUrgent) return 'from-orange-500 to-red-600';
    if (isMyTurn) return 'from-emerald-500 to-cyan-500';
    return 'from-slate-500 to-slate-600';
  };

  const getGlowColor = () => {
    if (isExpired || isUrgent) return 'shadow-[0_0_20px_rgba(239,68,68,0.5)]';
    if (isMyTurn) return 'shadow-[0_0_20px_rgba(16,185,129,0.4)]';
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      {/* Outer glow for urgent */}
      {isUrgent && isMyTurn && (
        <motion.div
          className="absolute -inset-2 bg-red-500/30 rounded-2xl blur-xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
      
      <div className={`
        relative flex items-center gap-4 px-5 py-3 rounded-xl
        bg-background/60 backdrop-blur-md
        border-2 transition-all duration-300
        ${isMyTurn ? 'border-emerald-500/50' : 'border-muted/50'}
        ${isUrgent && isMyTurn ? 'border-red-500/60' : ''}
        ${getGlowColor()}
      `}>
        {/* Animated icon */}
        <div className="relative">
          <motion.div
            className={`
              p-2.5 rounded-xl bg-gradient-to-br ${getTimerColor()}
              ${isUrgent && isMyTurn ? 'animate-pulse' : ''}
            `}
            animate={isUrgent && isMyTurn ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {isUrgent && isMyTurn ? (
              <AlertTriangle className="w-5 h-5 text-white" />
            ) : isMyTurn ? (
              <Zap className="w-5 h-5 text-white" />
            ) : (
              <Clock className="w-5 h-5 text-white" />
            )}
          </motion.div>
          
          {/* Icon glow */}
          {isMyTurn && (
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${getTimerColor()} blur-md opacity-50`} />
          )}
        </div>

        {/* Timer content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold ${
              isMyTurn ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {isMyTurn ? '⚡ Seu Turno' : '⏳ Turno do Oponente'}
            </span>
            <motion.span 
              className={`
                text-2xl font-bold tabular-nums
                ${isExpired ? 'text-red-500' : 
                  isUrgent && isMyTurn ? 'text-orange-500' : 
                  isMyTurn ? 'text-emerald-400' : 'text-muted-foreground'}
              `}
              animate={isUrgent && isMyTurn ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              {remainingSeconds}s
            </motion.span>
          </div>
          
          {/* Progress bar */}
          <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
            <motion.div 
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${getTimerColor()}`}
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
            
            {/* Shine effect */}
            {isMyTurn && !isUrgent && (
              <motion.div
                className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: [-32, 300] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

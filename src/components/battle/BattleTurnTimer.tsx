import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BattleTurnTimerProps {
  isMyTurn: boolean;
  turnStartedAt: string | null;
  maxSeconds?: number;
  onTimeout?: () => void;
}

export const BattleTurnTimer = ({ 
  isMyTurn, 
  turnStartedAt,
  maxSeconds = 15,
  onTimeout
}: BattleTurnTimerProps) => {
  const [remainingSeconds, setRemainingSeconds] = useState(maxSeconds);
  const timeoutCalledRef = useRef(false);

  useEffect(() => {
    if (!turnStartedAt) {
      setRemainingSeconds(maxSeconds);
      return;
    }

    // Reset timeout flag when turn changes
    timeoutCalledRef.current = false;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(turnStartedAt).getTime()) / 1000);
      const remaining = Math.max(0, maxSeconds - elapsed);
      setRemainingSeconds(remaining);

      if (remaining === 0 && !timeoutCalledRef.current) {
        timeoutCalledRef.current = true;
        clearInterval(interval);
        if (onTimeout) {
          onTimeout();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [turnStartedAt, maxSeconds, onTimeout]);

  const progress = (remainingSeconds / maxSeconds) * 100;
  const isUrgent = remainingSeconds <= 5;
  const isExpired = remainingSeconds === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border-2
        ${isMyTurn ? 'bg-primary/10 border-primary/50' : 'bg-muted/50 border-muted'}
        ${isUrgent && isMyTurn ? 'animate-pulse' : ''}
        transition-all duration-300
      `}
    >
      {/* Icon */}
      <div className={`
        p-2 rounded-full
        ${isMyTurn ? 'bg-primary/20' : 'bg-muted'}
      `}>
        {isUrgent && isMyTurn ? (
          <AlertTriangle className="w-4 h-4 text-destructive" />
        ) : (
          <Clock className={`w-4 h-4 ${isMyTurn ? 'text-primary' : 'text-muted-foreground'}`} />
        )}
      </div>

      {/* Timer info */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${isMyTurn ? 'text-foreground' : 'text-muted-foreground'}`}>
            {isMyTurn ? 'Seu Turno' : 'Turno do Oponente'}
          </span>
          <span className={`
            text-lg font-bold tabular-nums
            ${isExpired ? 'text-destructive' : isUrgent && isMyTurn ? 'text-destructive' : isMyTurn ? 'text-primary' : 'text-muted-foreground'}
          `}>
            {remainingSeconds}s
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative">
          <Progress 
            value={progress} 
            className={`h-2 ${isUrgent && isMyTurn ? 'bg-destructive/20' : ''}`}
          />
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
              isExpired ? 'bg-destructive' :
              isUrgent && isMyTurn ? 'bg-destructive' :
              isMyTurn ? 'bg-primary' : 'bg-muted-foreground'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
};

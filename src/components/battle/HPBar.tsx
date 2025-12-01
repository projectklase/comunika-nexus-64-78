import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface HPBarProps {
  currentHP: number;
  maxHP: number;
  playerName: string;
  isPlayer?: boolean;
}

export const HPBar = ({ currentHP, maxHP, playerName, isPlayer }: HPBarProps) => {
  const hpPercentage = (currentHP / maxHP) * 100;
  
  const getHPColor = () => {
    if (hpPercentage > 60) return 'from-green-500 to-emerald-500';
    if (hpPercentage > 30) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  return (
    <div className={`flex ${isPlayer ? 'flex-row' : 'flex-row-reverse'} items-center gap-4 p-4 bg-background/20 backdrop-blur-sm rounded-xl border border-border/50`}>
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
        <span className="text-2xl font-bold text-foreground">
          {currentHP}
          <span className="text-sm text-muted-foreground">/{maxHP}</span>
        </span>
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">{playerName}</span>
          <span className="text-xs text-muted-foreground">{hpPercentage.toFixed(0)}%</span>
        </div>
        
        <div className="h-3 bg-background/50 rounded-full overflow-hidden border border-border/30">
          <motion.div
            className={`h-full bg-gradient-to-r ${getHPColor()} relative`}
            initial={{ width: '100%' }}
            animate={{ width: `${hpPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-0 bg-white/20"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

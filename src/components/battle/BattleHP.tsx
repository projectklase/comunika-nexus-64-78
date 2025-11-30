import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BattleHPProps {
  currentHP: number;
  maxHP: number;
  playerName: string;
  isPlayer?: boolean;
}

interface FloatingDamage {
  id: number;
  amount: number;
  timestamp: number;
}

export const BattleHP = ({ currentHP, maxHP, playerName, isPlayer = false }: BattleHPProps) => {
  const [prevHP, setPrevHP] = useState(currentHP);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [shake, setShake] = useState(false);

  const hpPercentage = (currentHP / maxHP) * 100;
  
  // Determine HP bar color based on percentage
  const getHPColor = () => {
    if (hpPercentage > 60) return 'bg-success';
    if (hpPercentage > 30) return 'bg-warning';
    return 'bg-destructive';
  };

  useEffect(() => {
    if (currentHP < prevHP) {
      const damage = prevHP - currentHP;
      
      // Add floating damage number
      setFloatingDamages(prev => [...prev, {
        id: Date.now(),
        amount: damage,
        timestamp: Date.now(),
      }]);
      
      // Trigger shake animation
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      // Remove floating damage after animation
      setTimeout(() => {
        setFloatingDamages(prev => prev.filter(d => Date.now() - d.timestamp < 2000));
      }, 2000);
    }
    setPrevHP(currentHP);
  }, [currentHP, prevHP]);

  return (
    <div className={`relative ${isPlayer ? 'text-left' : 'text-right'}`}>
      {/* Player name */}
      <div className="flex items-center gap-2 mb-2">
        {isPlayer && <Heart className="w-4 h-4 text-destructive fill-destructive" />}
        <span className="text-sm font-medium text-foreground/80">{playerName}</span>
        {!isPlayer && <Heart className="w-4 h-4 text-destructive fill-destructive" />}
      </div>
      
      {/* HP Bar container */}
      <div className="relative h-8 w-48 bg-background/50 border border-border rounded-lg overflow-hidden backdrop-blur-sm">
        {/* HP Bar fill */}
        <motion.div
          className={`h-full ${getHPColor()} transition-all duration-300 ${shake ? 'animate-damage-shake' : ''}`}
          initial={{ width: `${hpPercentage}%` }}
          animate={{ width: `${hpPercentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
        </motion.div>
        
        {/* HP Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground drop-shadow-lg">
            {currentHP} / {maxHP}
          </span>
        </div>
      </div>
      
      {/* Floating damage numbers */}
      <AnimatePresence>
        {floatingDamages.map((damage) => (
          <motion.div
            key={damage.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -50, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none"
          >
            <span className="text-2xl font-bold text-destructive drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
              -{damage.amount}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

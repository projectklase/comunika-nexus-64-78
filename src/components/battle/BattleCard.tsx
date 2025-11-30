import { Card } from '@/types/cards';
import { motion } from 'framer-motion';
import { Swords, Shield, Zap } from 'lucide-react';
import { RARITY_COLORS, RARITY_FRAME_COLORS } from '@/types/cards';

interface BattleCardProps {
  card: Card;
  onClick?: () => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  showEffects?: boolean;
}

export const BattleCard = ({ 
  card, 
  onClick, 
  isSelectable = false,
  isSelected = false,
  showEffects = true 
}: BattleCardProps) => {
  const rarityColor = RARITY_COLORS[card.rarity];
  const frameColors = RARITY_FRAME_COLORS[card.rarity];
  
  const isLegendary = card.rarity === 'LEGENDARY';
  const isEpic = card.rarity === 'EPIC';

  return (
    <motion.div
      whileHover={isSelectable ? { scale: 1.05, y: -8 } : {}}
      whileTap={isSelectable ? { scale: 0.98 } : {}}
      onClick={isSelectable ? onClick : undefined}
      className={`
        relative w-24 h-32 rounded-lg overflow-hidden
        ${isSelectable ? 'cursor-pointer' : 'cursor-default'}
        ${isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' : ''}
        ${frameColors.outer}
        transition-all duration-200
      `}
      style={{
        boxShadow: isSelected 
          ? `0 0 20px currentColor, 0 0 40px currentColor` 
          : `0 4px 12px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Card image/background */}
      <div className="absolute inset-0">
        {card.image_url ? (
          <img 
            src={card.image_url} 
            alt={card.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${rarityColor}`} />
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
      </div>
      
      {/* Legendary rays effect */}
      {isLegendary && showEffects && (
        <div className="absolute inset-0 animate-golden-rays opacity-30">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,#fbbf24,transparent,#fbbf24,transparent)]" />
        </div>
      )}
      
      {/* Epic glow effect */}
      {isEpic && showEffects && (
        <div className="absolute inset-0 animate-glow-pulse opacity-50">
          <div className="absolute inset-0 bg-gradient-radial from-purple-500/30 to-transparent" />
        </div>
      )}
      
      {/* Card content */}
      <div className="relative h-full flex flex-col justify-between p-2">
        {/* Card name */}
        <div className="text-center">
          <h3 className="text-xs font-bold text-foreground drop-shadow-lg line-clamp-2">
            {card.name}
          </h3>
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-around mt-auto">
          {/* ATK */}
          <div className="flex items-center gap-1 bg-destructive/80 rounded px-1.5 py-0.5">
            <Swords className="w-3 h-3 text-destructive-foreground" />
            <span className="text-xs font-bold text-destructive-foreground">{card.atk}</span>
          </div>
          
          {/* DEF */}
          <div className="flex items-center gap-1 bg-primary/80 rounded px-1.5 py-0.5">
            <Shield className="w-3 h-3 text-primary-foreground" />
            <span className="text-xs font-bold text-primary-foreground">{card.def}</span>
          </div>
        </div>
        
        {/* Effects indicator */}
        {card.effects && card.effects.length > 0 && showEffects && (
          <div className="absolute top-1 right-1">
            <div className="bg-accent/80 rounded-full p-1">
              <Zap className="w-3 h-3 text-accent-foreground" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

import { Card } from '@/types/cards';
import { CardInPlay } from '@/hooks/useBattle';
import { motion } from 'framer-motion';
import { Swords, Shield, Zap } from 'lucide-react';
import { RARITY_COLORS, RARITY_FRAME_COLORS } from '@/types/cards';
import { RarityEffects } from './RarityEffects';
import { CardEffectOverlay } from './CardEffectOverlay';

interface BattleCardProps {
  card: Card | CardInPlay;
  onClick?: () => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  showEffects?: boolean;
}

// Type guard to check if card is full Card type
const isFullCard = (card: Card | CardInPlay): card is Card => {
  return 'category' in card && 'rarity' in card;
};

export const BattleCard = ({ 
  card, 
  onClick, 
  isSelectable = false,
  isSelected = false,
  showEffects = true 
}: BattleCardProps) => {
  // Use defaults for CardInPlay (simple cards in battle)
  const fullCard = isFullCard(card);
  const rarity = fullCard ? card.rarity : 'COMMON';
  const rarityColor = RARITY_COLORS[rarity];
  const frameColors = RARITY_FRAME_COLORS[rarity];
  
  const isLegendary = rarity === 'LEGENDARY';
  const isEpic = rarity === 'EPIC';
  const imageUrl = fullCard ? card.image_url : undefined;
  const effects = fullCard ? card.effects : [];

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
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={card.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${rarityColor}`} />
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
      </div>
      
      {/* Rarity-based visual effects */}
      {showEffects && <RarityEffects rarity={rarity} />}
      
      {/* Card effect overlays */}
      {showEffects && <CardEffectOverlay effects={effects} />}
      
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
        {effects && effects.length > 0 && showEffects && (
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

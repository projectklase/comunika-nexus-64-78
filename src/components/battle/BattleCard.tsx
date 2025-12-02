import { Card } from '@/types/cards';
import { CardInPlay } from '@/hooks/useBattle';
import { motion } from 'framer-motion';
import { Swords, Shield, Zap } from 'lucide-react';
import { RARITY_COLORS, RARITY_FRAME_COLORS } from '@/types/cards';
import { RarityEffects } from './RarityEffects';
import { CardEffectOverlay } from './CardEffectOverlay';
import { memo } from 'react';

interface BattleCardProps {
  card: Card | CardInPlay;
  onClick?: () => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  showEffects?: boolean;
}

// Type guard to check if card is full Card type
const isFullCard = (card: Card | CardInPlay): card is Card => {
  return 'category' in card;
};

export const BattleCard = memo(({ 
  card, 
  onClick, 
  isSelectable = false,
  isSelected = false,
  showEffects = true 
}: BattleCardProps) => {
  // Use defaults for CardInPlay (simple cards in battle)
  const fullCard = isFullCard(card);
  const rarity = (card as any).rarity || 'COMMON';
  const rarityColor = RARITY_COLORS[rarity];
  const frameColors = RARITY_FRAME_COLORS[rarity];
  
  const isLegendary = rarity === 'LEGENDARY';
  const isEpic = rarity === 'EPIC';
  const imageUrl = (card as any).image_url;
  const effects = (card as any).effects || [];

  return (
    <motion.div
      whileHover={isSelectable ? { 
        scale: 1.08, 
        y: -12,
        rotateZ: 0,
        rotateY: 5
      } : {}}
      whileTap={isSelectable ? { scale: 0.95 } : {}}
      onClick={isSelectable ? onClick : undefined}
      className={`
        relative w-16 h-24 sm:w-20 sm:h-28 lg:w-24 lg:h-32 rounded-lg overflow-hidden
        ${isSelectable ? 'cursor-pointer hover:z-10' : 'cursor-default'}
        ${isSelected ? 'ring-2 sm:ring-4 ring-primary ring-offset-1 sm:ring-offset-2 ring-offset-background scale-105 -translate-y-2' : ''}
        ${frameColors.outer}
        transition-all duration-300
      `}
      style={{
        boxShadow: isSelected 
          ? `0 0 20px currentColor, 0 0 40px currentColor, 0 8px 16px rgba(0,0,0,0.4)` 
          : isSelectable
          ? `0 4px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)`
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
      <div className="relative h-full flex flex-col justify-between p-1 sm:p-1.5 lg:p-2">
        {/* Card name */}
        <div className="text-center">
          <h3 className="text-[0.6rem] sm:text-xs font-bold text-foreground drop-shadow-lg line-clamp-2">
            {card.name}
          </h3>
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-around mt-auto">
          {/* ATK */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-destructive/80 rounded px-1 sm:px-1.5 py-0.5">
            <Swords className="w-2 h-2 sm:w-3 sm:h-3 text-destructive-foreground" />
            <span className="text-[0.6rem] sm:text-xs font-bold text-destructive-foreground">{card.atk}</span>
          </div>
          
          {/* HP (current_hp se disponível, senão DEF) */}
          {(() => {
            const currentHp = (card as any).current_hp;
            const maxHp = (card as any).max_hp || card.def;
            const isInBattle = currentHp !== undefined;
            const hpColor = isInBattle && currentHp < maxHp 
              ? currentHp <= maxHp * 0.3 ? 'bg-destructive/80' : 'bg-amber-500/80'
              : 'bg-primary/80';
            
            return (
              <div className={`flex items-center gap-0.5 sm:gap-1 ${hpColor} rounded px-1 sm:px-1.5 py-0.5`}>
                <Shield className="w-2 h-2 sm:w-3 sm:h-3 text-primary-foreground" />
                <span className="text-[0.6rem] sm:text-xs font-bold text-primary-foreground">
                  {isInBattle ? currentHp : card.def}
                </span>
              </div>
            );
          })()}
        </div>
        
        {/* Effects indicator */}
        {effects && effects.length > 0 && showEffects && (
          <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
            <div className="bg-accent/80 rounded-full p-0.5 sm:p-1">
              <Zap className="w-2 h-2 sm:w-3 sm:h-3 text-accent-foreground" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

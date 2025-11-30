import { Card, RARITY_COLORS, RARITY_LABELS } from '@/types/cards';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardDisplayProps {
  card: Card;
  quantity?: number;
  showStats?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CardDisplay = ({ 
  card, 
  quantity, 
  showStats = true, 
  onClick,
  className,
  size = 'md'
}: CardDisplayProps) => {
  const sizeClasses = {
    sm: 'w-32 h-44',
    md: 'w-40 h-56',
    lg: 'w-48 h-64'
  };

  const getRarityGlow = () => {
    switch (card.rarity) {
      case 'LEGENDARY':
        return 'shadow-lg shadow-yellow-500/50 animate-pulse';
      case 'EPIC':
        return 'shadow-lg shadow-purple-500/30';
      case 'RARE':
        return 'shadow-md shadow-blue-500/20';
      default:
        return '';
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105',
        sizeClasses[size],
        getRarityGlow(),
        `border-2 ${RARITY_COLORS[card.rarity]}`,
        className
      )}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background" />
      
      {/* Image */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} className="w-full h-full object-contain" />
        ) : (
          <Sparkles className="w-16 h-16 text-muted-foreground" />
        )}
      </div>

      {/* Quantity Badge */}
      {quantity !== undefined && quantity > 1 && (
        <div className="absolute top-2 right-2 bg-background/90 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm border-2 border-primary">
          {quantity}
        </div>
      )}

      {/* Card Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm p-2 border-t-2 border-border">
        <div className="flex items-center justify-between gap-1">
          <p className="font-semibold text-xs truncate">{card.name}</p>
          <Badge variant="secondary" className={cn('text-[10px] px-1', RARITY_COLORS[card.rarity])}>
            {RARITY_LABELS[card.rarity]}
          </Badge>
        </div>
        
        {showStats && (
          <div className="flex items-center justify-between mt-1 text-xs">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-orange-500" />
              <span className="font-bold">{card.atk}</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-500" />
              <span className="font-bold">{card.def}</span>
            </div>
            {card.effects.length > 0 && (
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-500" />
                <span className="font-bold">{card.effects.length}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

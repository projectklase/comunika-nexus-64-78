import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RewardItem } from '@/types/rewards';
import { Coins, Eye, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RewardCardProps {
  item: RewardItem;
  onViewDetails: (item: RewardItem) => void;
  onRedeem?: (item: RewardItem) => void;
  studentKoins?: number;
  isStudent?: boolean;
}

export function RewardCard({ 
  item, 
  onViewDetails, 
  onRedeem, 
  studentKoins = 0,
  isStudent = false 
}: RewardCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const isOutOfStock = item.stock <= 0;
  const canAfford = studentKoins >= item.koinPrice;
  const canRedeem = isStudent && !isOutOfStock && canAfford;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 cursor-pointer",
        "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
        "glass-card border-border/50",
        isOutOfStock && "opacity-75"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewDetails(item)}
    >
      {/* Stock Status Badge */}
      {isOutOfStock && (
        <Badge 
          variant="secondary" 
          className="absolute top-3 right-3 z-10 bg-destructive/90 text-destructive-foreground border-destructive/30"
        >
          Esgotado
        </Badge>
      )}

      <CardContent className="p-0">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={item.images[0] || '/placeholder.svg'}
            alt={item.name}
            className={cn(
              "w-full h-full object-cover transition-transform duration-300",
              "group-hover:scale-105",
              isOutOfStock && "grayscale"
            )}
          />
          
          {/* Hover Overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-black/60 transition-opacity duration-300 flex items-center justify-center gap-2",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            <Button
              size="sm"
              variant="secondary"
              className="backdrop-blur-sm bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(item);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalhes
            </Button>
            
            {isStudent && onRedeem && (
              <Button
                size="sm"
                variant="default"
                disabled={!canRedeem}
                className={cn(
                  "backdrop-blur-sm",
                  canRedeem 
                    ? "bg-primary/90 hover:bg-primary text-primary-foreground" 
                    : "bg-muted/60 text-muted-foreground cursor-not-allowed"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canRedeem) onRedeem(item);
                }}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Resgatar
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
              {item.name}
            </h3>
            
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            )}
          </div>

          {/* Price and Stock */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="font-bold text-lg text-foreground">
                {item.koinPrice}
              </span>
              <span className="text-sm text-muted-foreground">Koins</span>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                Estoque: {item.stock}
              </div>
              
              {isStudent && !canAfford && !isOutOfStock && (
                <div className="text-xs text-destructive">
                  Faltam {item.koinPrice - studentKoins} Koins
                </div>
              )}
            </div>
          </div>

          {/* Action Button for Students */}
          {isStudent && onRedeem && (
            <Button
              variant={canRedeem ? "default" : "outline"}
              size="sm"
              className="w-full mt-3"
              disabled={!canRedeem}
              onClick={(e) => {
                e.stopPropagation();
                if (canRedeem) onRedeem(item);
              }}
            >
              {isOutOfStock 
                ? "Esgotado" 
                : !canAfford 
                  ? `Faltam ${item.koinPrice - studentKoins} Koins`
                  : "Resgatar Agora"
              }
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
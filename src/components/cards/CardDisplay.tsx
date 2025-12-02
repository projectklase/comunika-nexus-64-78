import { Card, RARITY_COLORS, RARITY_LABELS, CATEGORY_COLORS, RARITY_FRAME_COLORS, CATEGORY_ICONS } from '@/types/cards';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface CardDisplayProps {
  card: Card;
  quantity?: number;
  showStats?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
    xs: 'w-10 h-14',
    sm: 'w-32 h-52',
    md: 'w-44 h-72',
    lg: 'w-52 h-80'
  };

  // For xs size, render ultra-compact version (just image with rarity border)
  if (size === 'xs') {
    const frameColors = RARITY_FRAME_COLORS[card.rarity];
    const categoryGradient = CATEGORY_COLORS[card.category];
    const CategoryIcon = (LucideIcons as any)[CATEGORY_ICONS[card.category]] || LucideIcons.Sparkles;
    
    return (
      <div
        onClick={onClick}
        className={cn(
          'relative rounded overflow-hidden cursor-pointer transition-all duration-200',
          'hover:scale-110',
          sizeClasses.xs,
          className
        )}
      >
        <div className={cn(
          'absolute inset-0 rounded p-[2px]',
          'bg-gradient-to-br',
          frameColors.outer
        )}>
          <div className="relative w-full h-full rounded overflow-hidden bg-gray-900">
            {card.image_url ? (
              <img 
                src={card.image_url} 
                alt={card.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={cn(
                'w-full h-full flex items-center justify-center',
                'bg-gradient-to-br',
                categoryGradient
              )}>
                <CategoryIcon className="w-4 h-4 text-white/60" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const frameColors = RARITY_FRAME_COLORS[card.rarity];
  const categoryGradient = CATEGORY_COLORS[card.category];
  
  // Get category icon dynamically
  const CategoryIcon = (LucideIcons as any)[CATEGORY_ICONS[card.category]] || LucideIcons.Sparkles;
  
  // Calculate level stars (1-5 based on required_level)
  const levelStars = Math.min(5, Math.max(1, Math.ceil(card.required_level / 20)));

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300',
        'hover:scale-105 hover:-translate-y-2',
        sizeClasses[size],
        frameColors.glow,
        className
      )}
    >
      {/* Outer Frame (Rarity Border) */}
      <div className={cn(
        'absolute inset-0 rounded-xl p-[3px]',
        'bg-gradient-to-br',
        frameColors.outer
      )}>
        {/* Inner Frame */}
        <div className={cn(
          'relative w-full h-full rounded-lg overflow-hidden',
          'bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900',
          'border-2',
          frameColors.inner
        )}>
          {/* Holographic Effect for LEGENDARY */}
          {card.rarity === 'LEGENDARY' && (
            <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-card-shine" 
                 style={{ backgroundSize: '200% 100%' }} />
          )}

          {/* Floating Particles for EPIC */}
          {card.rarity === 'EPIC' && (
            <>
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full opacity-60 animate-float-particles" />
              <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-purple-300 rounded-full opacity-70 animate-float-particles" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-purple-500 rounded-full opacity-50 animate-float-particles" style={{ animationDelay: '1s' }} />
            </>
          )}

          {/* Header with Category Icon and Name */}
          <div className={cn(
            'relative px-2 py-1.5 bg-gradient-to-r',
            categoryGradient,
            'border-b-2 border-white/20'
          )}>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <CategoryIcon className="w-4 h-4 text-white flex-shrink-0" />
                <span className="font-bold text-white text-xs truncate uppercase tracking-wide">
                  {card.name}
                </span>
              </div>
            </div>
          </div>

          {/* Illustration Area */}
          <div className="relative h-[50%] bg-gradient-to-b from-gray-800 to-gray-900 border-b-2 border-white/10">
            {card.image_url ? (
              <img 
                src={card.image_url} 
                alt={card.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={cn(
                'w-full h-full flex items-center justify-center',
                'bg-gradient-to-br',
                categoryGradient,
                'opacity-40'
              )}>
                <CategoryIcon className="w-16 h-16 text-white/30" />
              </div>
            )}
          </div>

          {/* Level Stars and Rarity Badge - only show when showStats is true */}
          {showStats && (
            <div className="relative px-2 py-1 bg-black/40 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: levelStars }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', RARITY_COLORS[card.rarity])}>
                  {RARITY_LABELS[card.rarity]}
                </Badge>
              </div>
            </div>
          )}

          {/* Stats Section */}
          {showStats && (
            <div className="relative px-2 py-2 space-y-1.5">
              {/* ATK / DEF */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-600/20 to-orange-900/20 rounded border border-orange-500/30">
                  <Zap className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                  <span className="text-xs font-bold text-orange-300">ATK</span>
                  <span className="text-sm font-bold text-white">{card.atk}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-600/20 to-blue-900/20 rounded border border-blue-500/30">
                  <Shield className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                  <span className="text-xs font-bold text-blue-300">DEF</span>
                  <span className="text-sm font-bold text-white">{card.def}</span>
                </div>
              </div>

              {/* Effects */}
              {card.effects.length > 0 && (
                <div className="px-2 py-1 bg-purple-900/20 rounded border border-purple-500/30">
                  <div className="flex items-center gap-1">
                    <LucideIcons.Sparkles className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] font-semibold text-purple-300 uppercase">
                      {card.effects[0].type}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity Badge */}
          {quantity !== undefined && quantity > 1 && (
            <div className="absolute top-2 right-2 bg-black/90 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-yellow-400 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]">
              {quantity}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import { Card, RARITY_COLORS, RARITY_LABELS, CATEGORY_COLORS, RARITY_FRAME_COLORS, CATEGORY_ICONS, RARITY_STARS } from '@/types/cards';
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

  const statSizes = {
    sm: {
      container: 'px-1 py-0.5',
      icon: 'w-2.5 h-2.5',
      label: 'text-[8px]',
      value: 'text-[9px]',
      gap: 'gap-0.5'
    },
    md: {
      container: 'px-2 py-1',
      icon: 'w-3.5 h-3.5',
      label: 'text-xs',
      value: 'text-sm',
      gap: 'gap-1'
    },
    lg: {
      container: 'px-2 py-1',
      icon: 'w-3.5 h-3.5',
      label: 'text-xs',
      value: 'text-sm',
      gap: 'gap-1'
    }
  };

  const currentStatSize = statSizes[size as 'sm' | 'md' | 'lg'] || statSizes.md;

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
  
  // Stars based on rarity
  const rarityStars = RARITY_STARS[card.rarity];

  // Determine if card should have holographic effect
  const hasHolographic = card.rarity === 'LEGENDARY' || card.rarity === 'SPECIAL';
  const hasLightFoil = card.rarity === 'EPIC' || card.rarity === 'RARE';

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300',
        'hover:scale-105 hover:-translate-y-2',
        'card-shimmer-hover',
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
          {/* Background Texture Layer - adds depth to all cards */}
          <div className="absolute inset-0 card-texture-overlay" />
          
          {/* Vignette Layer - adds depth */}
          <div className="absolute inset-0 card-vignette opacity-50" />

          {/* Holographic Foil Effect for LEGENDARY/SPECIAL */}
          {hasHolographic && (
            <div className="absolute inset-0 card-holographic-foil-intense z-10" />
          )}
          
          {/* Light Foil Effect for EPIC/RARE */}
          {hasLightFoil && (
            <div className="absolute inset-0 card-holographic-foil z-10" />
          )}

          {/* Floating Particles for EPIC */}
          {card.rarity === 'EPIC' && (
            <>
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full opacity-60 animate-float-particles z-20" />
              <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-purple-300 rounded-full opacity-70 animate-float-particles z-20" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-purple-500 rounded-full opacity-50 animate-float-particles z-20" style={{ animationDelay: '1s' }} />
            </>
          )}
          
          {/* Golden Particles for LEGENDARY */}
          {card.rarity === 'LEGENDARY' && (
            <>
              <div className="absolute top-1/5 left-1/5 w-1.5 h-1.5 bg-yellow-400 rounded-full opacity-70 animate-float-particles z-20" />
              <div className="absolute top-1/3 right-1/5 w-2 h-2 bg-yellow-300 rounded-full opacity-60 animate-float-particles z-20" style={{ animationDelay: '0.3s' }} />
              <div className="absolute top-2/3 left-1/4 w-1 h-1 bg-amber-400 rounded-full opacity-80 animate-float-particles z-20" style={{ animationDelay: '0.7s' }} />
              <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-yellow-500 rounded-full opacity-50 animate-float-particles z-20" style={{ animationDelay: '1.2s' }} />
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
          <div className="relative h-[50%] bg-gradient-to-b from-gray-800 to-gray-900 border-b-2 border-white/10 card-inner-glow">
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
            {/* Inner frame border for premium feel */}
            <div className="absolute inset-1 border border-white/5 rounded pointer-events-none" />
          </div>

          {/* Level Stars and Rarity Badge - only show when showStats is true */}
          {showStats && (
            <div className="relative px-2 py-1 bg-black/40 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: rarityStars }).map((_, i) => (
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
              <div className={cn("flex items-center justify-between", size === 'sm' ? 'gap-1' : 'gap-2')}>
                <div className={cn(
                  "flex items-center bg-gradient-to-r from-orange-600/20 to-orange-900/20 rounded border border-orange-500/30",
                  currentStatSize.container,
                  currentStatSize.gap
                )}>
                  <Zap className={cn("text-orange-400 fill-orange-400", currentStatSize.icon)} />
                  <span className={cn("font-bold text-orange-300", currentStatSize.label)}>ATK</span>
                  <span className={cn("font-bold text-white", currentStatSize.value)}>{card.atk}</span>
                </div>
                <div className={cn(
                  "flex items-center bg-gradient-to-r from-blue-600/20 to-blue-900/20 rounded border border-blue-500/30",
                  currentStatSize.container,
                  currentStatSize.gap
                )}>
                  <Shield className={cn("text-blue-400 fill-blue-400", currentStatSize.icon)} />
                  <span className={cn("font-bold text-blue-300", currentStatSize.label)}>DEF</span>
                  <span className={cn("font-bold text-white", currentStatSize.value)}>{card.def}</span>
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

import { Card, RARITY_COLORS, RARITY_LABELS, CATEGORY_COLORS, RARITY_FRAME_COLORS, CATEGORY_ICONS, RARITY_STARS } from '@/types/cards';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const [shinePosition, setShinePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || size === 'xs' || size === 'sm') return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate tilt (max 15 degrees)
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;
    
    // Calculate shine position (percentage)
    const shineX = (x / rect.width) * 100;
    const shineY = (y / rect.height) * 100;
    
    // Calculate shadow offset based on tilt
    const shadowX = rotateY * 1.5;
    const shadowY = rotateX * -1.5;
    
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
      boxShadow: `${shadowX}px ${shadowY + 15}px 30px rgba(0, 0, 0, 0.4), 
                  ${shadowX * 0.5}px ${shadowY * 0.5 + 8}px 15px rgba(0, 0, 0, 0.3)`,
      transition: 'transform 0.1s ease-out, box-shadow 0.1s ease-out',
    });
    setShinePosition({ x: shineX, y: shineY });
  }, [size]);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      boxShadow: 'none',
      transition: 'transform 0.4s ease-out, box-shadow 0.4s ease-out',
    });
    setIsHovering(false);
    setShinePosition({ x: 50, y: 50 });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

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
            {card.image_url && !imageError ? (
              <img 
                src={card.image_url} 
                alt={card.name} 
                loading="lazy"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
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

  // Determine rarity-specific wrapper class
  const rarityWrapperClass = card.rarity === 'COMMON' ? 'card-common-shimmer' : '';

  // Enable 3D hover only for md and lg sizes
  const enable3DHover = size === 'md' || size === 'lg';

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={enable3DHover ? handleMouseMove : undefined}
      onMouseEnter={enable3DHover ? handleMouseEnter : undefined}
      onMouseLeave={enable3DHover ? handleMouseLeave : undefined}
      style={enable3DHover ? tiltStyle : undefined}
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer',
        !enable3DHover && 'transition-all duration-300 hover:scale-105 hover:-translate-y-2',
        rarityWrapperClass,
        sizeClasses[size],
        frameColors.glow,
        className
      )}
    >
      {/* Dynamic Shine Overlay - follows cursor */}
      {enable3DHover && isHovering && (
        <div 
          className="absolute inset-0 z-30 pointer-events-none rounded-xl"
          style={{
            background: `radial-gradient(circle at ${shinePosition.x}% ${shinePosition.y}%, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 20%, transparent 50%)`,
          }}
        />
      )}
      
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

          {/* RARE: Animated blue reflection */}
          {card.rarity === 'RARE' && (
            <div className="card-rare-reflection" />
          )}

          {/* EPIC: Pulsating aura effect */}
          {card.rarity === 'EPIC' && (
            <div className="card-epic-aura" />
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
            {/* Skeleton while loading */}
            {card.image_url && !imageLoaded && !imageError && (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
            
            {card.image_url && !imageError ? (
              <img 
                src={card.image_url} 
                alt={card.name} 
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
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
                <div className="flex items-center gap-1">
                  {Array.from({ length: rarityStars }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "relative",
                        card.rarity === 'LEGENDARY' && "card-star-legendary",
                      )}
                      style={{ animationDelay: `${i * 0.15}s` }}
                    >
                      <Star 
                        className={cn(
                          "w-3.5 h-3.5 card-star",
                          card.rarity === 'LEGENDARY' && "fill-amber-400 text-amber-300",
                          card.rarity === 'SPECIAL' && "fill-pink-400 text-pink-300",
                          card.rarity === 'EPIC' && "fill-purple-400 text-purple-300 card-star-epic",
                          card.rarity === 'RARE' && "fill-blue-400 text-blue-300 card-star-rare",
                          card.rarity === 'COMMON' && "fill-yellow-400 text-yellow-400",
                        )} 
                      />
                    </div>
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
                  "flex items-center rounded border border-orange-500/40 relative overflow-hidden",
                  "bg-gradient-to-r from-orange-600/30 via-orange-500/20 to-orange-900/30",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.2)]",
                  currentStatSize.container,
                  currentStatSize.gap
                )}>
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==')] opacity-50" />
                  <Zap className={cn("text-orange-400 fill-orange-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.7)]", currentStatSize.icon)} />
                  <span className={cn("font-bold text-orange-300 drop-shadow-[0_0_2px_rgba(251,146,60,0.5)]", currentStatSize.label)}>ATK</span>
                  <span 
                    className={cn("font-bold text-white", currentStatSize.value)}
                    style={{ textShadow: '0 1px 0 #666, 0 2px 0 #555, 0 0 8px rgba(251,146,60,0.4)' }}
                  >
                    {card.atk}
                  </span>
                </div>
                <div className={cn(
                  "flex items-center rounded border border-blue-500/40 relative overflow-hidden",
                  "bg-gradient-to-r from-blue-600/30 via-blue-500/20 to-blue-900/30",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.2)]",
                  currentStatSize.container,
                  currentStatSize.gap
                )}>
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==')] opacity-50" />
                  <Shield className={cn("text-blue-400 fill-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.7)]", currentStatSize.icon)} />
                  <span className={cn("font-bold text-blue-300 drop-shadow-[0_0_2px_rgba(96,165,250,0.5)]", currentStatSize.label)}>DEF</span>
                  <span 
                    className={cn("font-bold text-white", currentStatSize.value)}
                    style={{ textShadow: '0 1px 0 #666, 0 2px 0 #555, 0 0 8px rgba(96,165,250,0.4)' }}
                  >
                    {card.def}
                  </span>
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
            <div className="absolute top-2 right-2 bg-black/90 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-yellow-400 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-[scale-in_0.3s_ease-out,quantity-pulse_2s_ease-in-out_infinite]">
              {quantity}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

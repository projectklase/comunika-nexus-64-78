import { Card, RARITY_LABELS, CATEGORY_LABELS, RARITY_FRAME_COLORS, EFFECT_MECHANICS, CardEffectType } from '@/types/cards';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, Shield, Star, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardDisplay } from './CardDisplay';

interface CardDetailModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  quantity?: number;
}

export const CardDetailModal = ({ card, isOpen, onClose, quantity }: CardDetailModalProps) => {
  if (!card) return null;

  const getEffectIcon = (type: string) => {
    switch (type) {
      case 'BURN': return '🔥';
      case 'SHIELD': return '🛡️';
      case 'BOOST': return '⚡';
      case 'HEAL': return '💚';
      case 'FREEZE': return '❄️';
      case 'DOUBLE': return '✨';
      default: return '⭐';
    }
  };

  const frameColors = RARITY_FRAME_COLORS[card.rarity];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        // Mobile: bottom sheet - sobrescrever posição do Radix
        "w-full h-auto max-h-[80vh] rounded-t-xl rounded-b-none p-4",
        "left-0 bottom-0 top-auto translate-x-0 translate-y-0",
        // Desktop: modal centralizado
        "sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2",
        "sm:max-w-4xl sm:max-h-[90vh] sm:rounded-lg sm:p-6",
        "overflow-y-auto"
      )}>
        {/* Handle para arrastar (mobile) */}
        <div className="sm:hidden w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />

        <DialogHeader className="pb-2 sm:pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-2xl flex-wrap">
            {card.name}
            <Badge variant="secondary" className={cn('text-xs sm:text-base px-2 sm:px-3 py-0.5 sm:py-1 border-2', frameColors.inner)}>
              {RARITY_LABELS[card.rarity]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column: Card Preview + Quantity */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 sm:pt-6 sm:sticky sm:top-6 self-start">
            <CardDisplay 
              card={card} 
              size="sm"
              showStats={true}
              className="max-h-[25vh] sm:max-h-none transform-none hover:transform-none"
            />
            
            {/* Badge de quantidade compacto */}
            {quantity !== undefined && quantity > 0 && (
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-500/10 rounded-full border border-yellow-500/30">
                <span className="text-[10px] sm:text-xs text-yellow-300/70">Na coleção:</span>
                <span className="text-xs sm:text-sm font-bold text-yellow-300">{quantity}x</span>
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div className="space-y-3 sm:space-y-4">
            {/* Card Info */}
            <div className={cn(
              'p-2 sm:p-3 rounded-lg border-2',
              'bg-gradient-to-br',
              frameColors.outer,
              frameColors.glow
            )}>
              <div className="bg-gray-900/90 rounded p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                <div>
                  <p className="text-[10px] sm:text-xs text-gray-400">Categoria</p>
                  <p className="font-semibold text-sm sm:text-base text-white">{CATEGORY_LABELS[card.category]}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-gray-400">Nível Necessário</p>
                  <p className="font-semibold text-sm sm:text-base flex items-center gap-1 text-white">
                    {Array.from({ length: Math.min(5, Math.ceil(card.required_level / 20)) }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="ml-1">Nível {card.required_level}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {card.description && (
              <div className="p-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1">Descrição</p>
                <p className="text-xs sm:text-sm text-gray-200">{card.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-gradient-to-br from-orange-600/20 to-orange-900/20 rounded-lg border-2 border-orange-500/50">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400 fill-orange-400" />
                <div>
                  <p className="text-[9px] sm:text-[10px] text-orange-300 uppercase tracking-wide">Ataque</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{card.atk}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-gradient-to-br from-blue-600/20 to-blue-900/20 rounded-lg border-2 border-blue-500/50">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 fill-blue-400" />
                <div>
                  <p className="text-[9px] sm:text-[10px] text-blue-300 uppercase tracking-wide">Defesa</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{card.def}</p>
                </div>
              </div>
            </div>

            {/* Special Effects - Compact */}
            {card.effects.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-[10px] sm:text-xs text-gray-400 font-semibold">Efeitos Especiais</p>
                <div className="space-y-1.5 sm:space-y-2">
                  {card.effects.map((effect, index) => {
                    const mechanics = EFFECT_MECHANICS[effect.type as CardEffectType];
                    return (
                      <div key={index} className="p-2 sm:p-3 bg-gradient-to-br from-purple-600/20 to-purple-900/20 rounded-lg border border-purple-500/50">
                        {/* Header do efeito - compacto */}
                        <div className="flex items-start gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <span className="text-base sm:text-xl">{getEffectIcon(effect.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <p className="font-bold text-purple-300 uppercase tracking-wide text-xs sm:text-sm">{effect.type}</p>
                              <span className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] text-purple-300/70">
                                <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Poder: {effect.value}
                              </span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-300 mt-0.5 line-clamp-2">{effect.description}</p>
                          </div>
                        </div>

                        {/* Mecânicas compactas em linha única */}
                        {mechanics && (
                          <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 sm:gap-y-1 pt-1.5 sm:pt-2 border-t border-purple-500/20 text-[9px] sm:text-[10px]">
                            <span className="flex items-center gap-0.5 sm:gap-1 text-yellow-300/80">
                              <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> {mechanics.activation}
                            </span>
                            <span className="flex items-center gap-0.5 sm:gap-1 text-cyan-300/80">
                              <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> {mechanics.duration}
                            </span>
                            <span className="flex items-center gap-0.5 sm:gap-1 text-red-300/80">
                              <Target className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> {mechanics.consumption}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {card.name}
            <Badge variant="secondary" className={cn('text-base px-3 py-1 border-2', frameColors.inner)}>
              {RARITY_LABELS[card.rarity]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: Card Preview + Quantity - STICKY */}
          <div className="flex flex-col items-center gap-3 pt-4 md:pt-6 md:sticky md:top-6 self-start">
            <CardDisplay 
              card={card} 
              size="md"
              showStats={true}
              className="transform-none hover:transform-none"
            />
            
            {/* Badge de quantidade compacto */}
            {quantity !== undefined && quantity > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/30">
                <span className="text-xs text-yellow-300/70">Na coleção:</span>
                <span className="text-sm font-bold text-yellow-300">{quantity}x</span>
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div className="space-y-4">
            {/* Card Info */}
            <div className={cn(
              'p-3 rounded-lg border-2',
              'bg-gradient-to-br',
              frameColors.outer,
              frameColors.glow
            )}>
              <div className="bg-gray-900/90 rounded p-3 space-y-2">
                <div>
                  <p className="text-xs text-gray-400">Categoria</p>
                  <p className="font-semibold text-base text-white">{CATEGORY_LABELS[card.category]}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Nível Necessário</p>
                  <p className="font-semibold text-base flex items-center gap-1.5 text-white">
                    {Array.from({ length: Math.min(5, Math.ceil(card.required_level / 20)) }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="ml-1">Nível {card.required_level}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {card.description && (
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Descrição</p>
                <p className="text-sm text-gray-200">{card.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-orange-600/20 to-orange-900/20 rounded-lg border-2 border-orange-500/50">
                <Zap className="w-6 h-6 text-orange-400 fill-orange-400" />
                <div>
                  <p className="text-[10px] text-orange-300 uppercase tracking-wide">Ataque</p>
                  <p className="text-2xl font-bold text-white">{card.atk}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-blue-600/20 to-blue-900/20 rounded-lg border-2 border-blue-500/50">
                <Shield className="w-6 h-6 text-blue-400 fill-blue-400" />
                <div>
                  <p className="text-[10px] text-blue-300 uppercase tracking-wide">Defesa</p>
                  <p className="text-2xl font-bold text-white">{card.def}</p>
                </div>
              </div>
            </div>

            {/* Special Effects - Compact */}
            {card.effects.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-semibold">Efeitos Especiais</p>
                <div className="space-y-2">
                  {card.effects.map((effect, index) => {
                    const mechanics = EFFECT_MECHANICS[effect.type as CardEffectType];
                    return (
                      <div key={index} className="p-3 bg-gradient-to-br from-purple-600/20 to-purple-900/20 rounded-lg border border-purple-500/50">
                        {/* Header do efeito - compacto */}
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xl">{getEffectIcon(effect.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-purple-300 uppercase tracking-wide text-sm">{effect.type}</p>
                              <span className="flex items-center gap-1 text-[10px] text-purple-300/70">
                                <Sparkles className="w-2.5 h-2.5" /> Poder: {effect.value}
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">{effect.description}</p>
                          </div>
                        </div>

                        {/* Mecânicas compactas em linha única */}
                        {mechanics && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-purple-500/20 text-[10px]">
                            <span className="flex items-center gap-1 text-yellow-300/80">
                              <Zap className="w-2.5 h-2.5" /> {mechanics.activation}
                            </span>
                            <span className="flex items-center gap-1 text-cyan-300/80">
                              <Clock className="w-2.5 h-2.5" /> {mechanics.duration}
                            </span>
                            <span className="flex items-center gap-1 text-red-300/80">
                              <Target className="w-2.5 h-2.5" /> {mechanics.consumption}
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

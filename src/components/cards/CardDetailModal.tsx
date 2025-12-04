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
        {/* Left Column: Card Preview + Quantity */}
        <div className="flex flex-col items-center justify-center gap-2">
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
          <div className="space-y-6">
            {/* Card Info */}
            <div className={cn(
              'p-4 rounded-lg border-2',
              'bg-gradient-to-br',
              frameColors.outer,
              frameColors.glow
            )}>
              <div className="bg-gray-900/90 rounded p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Categoria</p>
                  <p className="font-semibold text-lg text-white">{CATEGORY_LABELS[card.category]}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Nível Necessário</p>
                  <p className="font-semibold text-lg flex items-center gap-2 text-white">
                    {Array.from({ length: Math.min(5, Math.ceil(card.required_level / 20)) }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="ml-2">Nível {card.required_level}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {card.description && (
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Descrição</p>
                <p className="text-sm text-gray-200">{card.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-orange-600/20 to-orange-900/20 rounded-lg border-2 border-orange-500/50">
                <Zap className="w-8 h-8 text-orange-400 fill-orange-400" />
                <div>
                  <p className="text-xs text-orange-300 uppercase tracking-wide">Ataque</p>
                  <p className="text-3xl font-bold text-white">{card.atk}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-600/20 to-blue-900/20 rounded-lg border-2 border-blue-500/50">
                <Shield className="w-8 h-8 text-blue-400 fill-blue-400" />
                <div>
                  <p className="text-xs text-blue-300 uppercase tracking-wide">Defesa</p>
                  <p className="text-3xl font-bold text-white">{card.def}</p>
                </div>
              </div>
            </div>

            {/* Special Effects */}
            {card.effects.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 font-semibold">Efeitos Especiais</p>
                <div className="space-y-3">
                  {card.effects.map((effect, index) => {
                    const mechanics = EFFECT_MECHANICS[effect.type as CardEffectType];
                    return (
                      <div key={index} className="p-4 bg-gradient-to-br from-purple-600/20 to-purple-900/20 rounded-lg border-2 border-purple-500/50">
                        {/* Header do efeito */}
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-2xl">{getEffectIcon(effect.type)}</span>
                          <div className="flex-1">
                            <p className="font-bold text-purple-300 uppercase tracking-wide">{effect.type}</p>
                            <p className="text-sm text-gray-300 mt-1">{effect.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              <p className="text-xs text-purple-300">Poder: {effect.value}</p>
                            </div>
                          </div>
                        </div>

                        {/* Mecânicas do efeito */}
                        {mechanics && (
                          <div className="mt-3 pt-3 border-t border-purple-500/30 space-y-2">
                            <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-2">Mecânicas</p>
                            
                            <div className="flex items-center gap-2 text-xs">
                              <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-yellow-300/80 font-medium">Ativação:</span>
                              <span className="text-gray-300">{mechanics.activation}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs">
                              <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                              <span className="text-cyan-300/80 font-medium">Duração:</span>
                              <span className="text-gray-300">{mechanics.duration}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs">
                              <Target className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              <span className="text-red-300/80 font-medium">Consumo:</span>
                              <span className="text-gray-300">{mechanics.consumption}</span>
                            </div>
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

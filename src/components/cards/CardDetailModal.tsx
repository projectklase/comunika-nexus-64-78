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
        // Mobile: tela cheia sem bordas
        "w-screen h-screen max-h-screen rounded-none p-0 m-0",
        "fixed inset-0 translate-x-0 translate-y-0",
        // Desktop: modal elegante centralizado
        "sm:w-auto sm:h-auto sm:max-w-4xl sm:max-h-[90vh]",
        "sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
        "sm:rounded-lg sm:p-6",
        // Layout base
        "flex flex-col overflow-hidden",
        "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
        "border-0 sm:border sm:border-gray-700"
      )}>
        {/* Header fixo no topo */}
        <DialogHeader className={cn(
          "relative z-10 px-4 pt-4 pb-2 shrink-0",
          "bg-gray-900/95 backdrop-blur-sm border-b border-gray-800",
          "sm:bg-transparent sm:border-0 sm:pb-4"
        )}>
          <DialogTitle className="flex items-center justify-center gap-2 text-lg sm:text-2xl flex-wrap text-center">
            <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] break-words">{card.name}</span>
            <Badge 
              variant="secondary" 
              className={cn(
                'text-xs sm:text-base px-2 sm:px-3 py-0.5 sm:py-1 border-2 shadow-lg shrink-0',
                frameColors.inner
              )}
            >
              {RARITY_LABELS[card.rarity]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Conteúdo scrollável com overflow prevention */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-0 max-w-full">
            
            {/* Coluna da Carta */}
            <div className="flex flex-col items-center gap-3 sm:pt-6 sm:sticky sm:top-6 self-start w-full">
              {/* Mobile: carta grande para visualização */}
              <div className="sm:hidden">
                <CardDisplay 
                  card={card} 
                  size="lg"
                  showStats={true}
                />
              </div>
              {/* Desktop: tamanho médio */}
              <div className="hidden sm:block">
                <CardDisplay 
                  card={card} 
                  size="md"
                  showStats={true}
                />
              </div>
              
              {/* Badge de quantidade */}
              {quantity !== undefined && quantity > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-full border border-yellow-500/30">
                  <span className="text-xs text-yellow-300/70">Na coleção:</span>
                  <span className="text-base font-bold text-yellow-300">{quantity}x</span>
                </div>
              )}
            </div>

            {/* Coluna de Detalhes - com overflow containment */}
            <div className="space-y-3 sm:space-y-4 overflow-hidden max-w-full min-w-0 pb-6">
              {/* Card Info */}
              <div className={cn(
                'p-2 sm:p-3 rounded-lg border-2 w-full overflow-hidden',
                'bg-gradient-to-br',
                frameColors.outer,
                frameColors.glow
              )}>
                <div className="bg-gray-900/90 rounded p-2 sm:p-3 space-y-1.5 sm:space-y-2 overflow-hidden">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-400">Categoria</p>
                    <p className="font-semibold text-sm sm:text-base text-white truncate">{CATEGORY_LABELS[card.category]}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-400">Nível Necessário</p>
                    <p className="font-semibold text-sm sm:text-base flex items-center gap-1 text-white flex-wrap">
                      {Array.from({ length: Math.min(5, Math.ceil(card.required_level / 20)) }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400 shrink-0" />
                      ))}
                      <span className="ml-1">Nível {card.required_level}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {card.description && (
                <div className="p-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700 w-full overflow-hidden">
                  <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1">Descrição</p>
                  <p className="text-xs sm:text-sm text-gray-200 break-words whitespace-pre-wrap">{card.description}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
                <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-gradient-to-br from-orange-600/20 to-orange-900/20 rounded-lg border-2 border-orange-500/50 overflow-hidden">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400 fill-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-orange-300 uppercase tracking-wide">Ataque</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{card.atk}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-gradient-to-br from-blue-600/20 to-blue-900/20 rounded-lg border-2 border-blue-500/50 overflow-hidden">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 fill-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-blue-300 uppercase tracking-wide">Defesa</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{card.def}</p>
                  </div>
                </div>
              </div>

              {/* Special Effects */}
              {card.effects.length > 0 && (
                <div className="space-y-1.5 sm:space-y-2 w-full overflow-hidden">
                  <p className="text-[10px] sm:text-xs text-gray-400 font-semibold">Efeitos Especiais</p>
                  <div className="space-y-1.5 sm:space-y-2">
                    {card.effects.map((effect, index) => {
                      const mechanics = EFFECT_MECHANICS[effect.type as CardEffectType];
                      return (
                        <div key={index} className="p-2 sm:p-3 bg-gradient-to-br from-purple-600/20 to-purple-900/20 rounded-lg border border-purple-500/50 overflow-hidden">
                          {/* Header do efeito */}
                          <div className="flex items-start gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                            <span className="text-base sm:text-xl shrink-0">{getEffectIcon(effect.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <p className="font-bold text-purple-300 uppercase tracking-wide text-xs sm:text-sm">{effect.type}</p>
                                <span className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] text-purple-300/70 shrink-0">
                                  <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Poder: {effect.value}
                                </span>
                              </div>
                              <p className="text-[10px] sm:text-xs text-gray-300 mt-0.5 break-words">{effect.description}</p>
                            </div>
                          </div>

                          {/* Mecânicas */}
                          {mechanics && (
                            <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 sm:gap-y-1 pt-1.5 sm:pt-2 border-t border-purple-500/20 text-[9px] sm:text-[10px]">
                              <span className="flex items-center gap-0.5 sm:gap-1 text-yellow-300/80">
                                <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" /> {mechanics.activation}
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1 text-cyan-300/80">
                                <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" /> {mechanics.duration}
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1 text-red-300/80">
                                <Target className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" /> {mechanics.consumption}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

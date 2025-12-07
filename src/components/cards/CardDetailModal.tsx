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
      <DialogContent 
        className={cn(
          // Mobile: tela cheia fixa sem bordas
          "w-screen h-[100dvh] max-h-[100dvh] rounded-none p-0 m-0 border-0",
          "inset-0 left-0 right-0 top-0 bottom-0",
          "translate-x-0 translate-y-0",
          // Desktop: modal elegante centralizado
          "sm:w-auto sm:h-auto sm:max-w-4xl sm:max-h-[90vh]",
          "sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-lg sm:p-6 sm:border sm:border-gray-700",
          // Layout base
          "flex flex-col overflow-hidden overscroll-none",
          "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
        )}
        style={{ position: 'fixed' }}
      >
        {/* Header fixo no topo - com safe area padding */}
        <DialogHeader className={cn(
          "shrink-0 px-4 pt-12 pb-3",
          "bg-gray-900/98 backdrop-blur-sm border-b border-gray-800",
          "sm:bg-transparent sm:border-0 sm:pt-0 sm:pb-4 sm:px-0"
        )}>
          <DialogTitle className="flex items-center justify-center gap-2 text-lg sm:text-2xl flex-wrap text-center">
            <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] break-words max-w-[200px] sm:max-w-none">
              {card.name}
            </span>
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

        {/* Conteúdo scrollável - apenas esta área tem scroll */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y px-4 py-4 sm:px-0 sm:py-0"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4 sm:gap-6 pb-4 sm:pb-6">
            
            {/* Coluna da Carta - CENTRALIZADA */}
            <div className="flex flex-col items-center justify-center gap-3 w-full sm:sticky sm:top-6 sm:self-start">
              <CardDisplay 
                card={card} 
                size="lg"
                showStats={true}
              />
              
              {/* Badge de quantidade */}
              {quantity !== undefined && quantity > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-full border border-yellow-500/30">
                  <span className="text-xs text-yellow-300/70">Na coleção:</span>
                  <span className="text-base font-bold text-yellow-300">{quantity}x</span>
                </div>
              )}

              {/* Mobile: Descrição logo após a carta */}
              {card.description && (
                <div className="sm:hidden p-3 bg-gray-800/50 rounded-lg border border-gray-700 w-full max-w-[280px]">
                  <p className="text-xs text-gray-400 mb-1">Descrição</p>
                  <p className="text-sm text-gray-200 break-words whitespace-pre-wrap">{card.description}</p>
                </div>
              )}
            </div>

            {/* Coluna de Detalhes - apenas desktop para info duplicada */}
            <div className="space-y-3 sm:space-y-4 overflow-hidden max-w-full min-w-0 pb-6">
              
              {/* Card Info - apenas desktop (já está na carta no mobile) */}
              <div className={cn(
                'hidden sm:block p-3 rounded-lg border-2 w-full overflow-hidden',
                'bg-gradient-to-br',
                frameColors.outer,
                frameColors.glow
              )}>
                <div className="bg-gray-900/90 rounded p-3 space-y-2 overflow-hidden">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Categoria</p>
                    <p className="font-semibold text-base text-white truncate">{CATEGORY_LABELS[card.category]}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Nível Necessário</p>
                    <p className="font-semibold text-base flex items-center gap-1 text-white flex-wrap">
                      {Array.from({ length: Math.min(5, Math.ceil(card.required_level / 20)) }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400 shrink-0" />
                      ))}
                      <span className="ml-1">Nível {card.required_level}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Description - apenas desktop (mobile mostra acima) */}
              {card.description && (
                <div className="hidden sm:block p-3 bg-gray-800/50 rounded-lg border border-gray-700 w-full overflow-hidden">
                  <p className="text-xs text-gray-400 mb-1">Descrição</p>
                  <p className="text-sm text-gray-200 break-words whitespace-pre-wrap">{card.description}</p>
                </div>
              )}

              {/* Stats - apenas desktop (já visíveis na carta) */}
              <div className="hidden sm:grid grid-cols-2 gap-3 w-full">
                <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-orange-600/20 to-orange-900/20 rounded-lg border-2 border-orange-500/50 overflow-hidden">
                  <Zap className="w-6 h-6 text-orange-400 fill-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-orange-300 uppercase tracking-wide">Ataque</p>
                    <p className="text-2xl font-bold text-white">{card.atk}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-blue-600/20 to-blue-900/20 rounded-lg border-2 border-blue-500/50 overflow-hidden">
                  <Shield className="w-6 h-6 text-blue-400 fill-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-blue-300 uppercase tracking-wide">Defesa</p>
                    <p className="text-2xl font-bold text-white">{card.def}</p>
                  </div>
                </div>
              </div>

              {/* Special Effects - sempre visível (info expandida) */}
              {card.effects.length > 0 && (
                <div className="space-y-2 w-full overflow-hidden">
                  <p className="text-xs text-gray-400 font-semibold">Efeitos Especiais</p>
                  <div className="space-y-2">
                    {card.effects.map((effect, index) => {
                      const mechanics = EFFECT_MECHANICS[effect.type as CardEffectType];
                      return (
                        <div key={index} className="p-3 bg-gradient-to-br from-purple-600/20 to-purple-900/20 rounded-lg border border-purple-500/50 overflow-hidden">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-xl shrink-0">{getEffectIcon(effect.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-purple-300 uppercase tracking-wide text-sm">{effect.type}</p>
                                <span className="flex items-center gap-1 text-[10px] text-purple-300/70 shrink-0">
                                  <Sparkles className="w-2.5 h-2.5" /> Poder: {effect.value}
                                </span>
                              </div>
                              <p className="text-xs text-gray-300 mt-1 break-words">{effect.description}</p>
                            </div>
                          </div>

                          {mechanics && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-purple-500/20 text-[10px]">
                              <span className="flex items-center gap-1 text-yellow-300/80">
                                <Zap className="w-2.5 h-2.5 shrink-0" /> {mechanics.activation}
                              </span>
                              <span className="flex items-center gap-1 text-cyan-300/80">
                                <Clock className="w-2.5 h-2.5 shrink-0" /> {mechanics.duration}
                              </span>
                              <span className="flex items-center gap-1 text-red-300/80">
                                <Target className="w-2.5 h-2.5 shrink-0" /> {mechanics.consumption}
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

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Flame, Sparkles, AlertTriangle, Package } from 'lucide-react';
import { UserCard, Card, RARITY_LABELS } from '@/types/cards';
import { CardDisplay } from './CardDisplay';
import { 
  useCardRecycling, 
  RecycleSelection, 
  calculateRecyclePreview,
  getRecyclableCards 
} from '@/hooks/useCardRecycling';
import { RECYCLE_XP_VALUES } from '@/constants/card-recycling';
import { cn } from '@/lib/utils';

interface CardRecycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCards: UserCard[];
}

export function CardRecycleModal({ isOpen, onClose, userCards }: CardRecycleModalProps) {
  const [selections, setSelections] = useState<Map<string, number>>(new Map());
  const { recycleCardsAsync, isRecycling } = useCardRecycling();

  // Filtrar cartas recicláveis (duplicatas)
  const recyclableCards = useMemo(() => getRecyclableCards(userCards), [userCards]);

  // Calcular preview
  const selectedItems: RecycleSelection[] = useMemo(() => {
    return Array.from(selections.entries())
      .filter(([_, qty]) => qty > 0)
      .map(([cardId, quantity]) => {
        const userCard = recyclableCards.find(uc => uc.card_id === cardId);
        return {
          cardId,
          quantity,
          card: userCard?.card as Card,
        };
      })
      .filter(s => s.card);
  }, [selections, recyclableCards]);

  const preview = useMemo(() => {
    if (selectedItems.length === 0) return null;
    return calculateRecyclePreview(selectedItems);
  }, [selectedItems]);

  const handleQuantityChange = (cardId: string, quantity: number) => {
    setSelections(prev => {
      const next = new Map(prev);
      if (quantity <= 0) {
        next.delete(cardId);
      } else {
        next.set(cardId, quantity);
      }
      return next;
    });
  };

  const handleRecycle = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      await recycleCardsAsync(selectedItems);
      setSelections(new Map());
      onClose();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleClose = () => {
    if (!isRecycling) {
      setSelections(new Map());
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            Forja de Cartas
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Transforme cartas duplicadas em XP! Você sempre mantém pelo menos 1 cópia.
          </p>
        </DialogHeader>

        {recyclableCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-base sm:text-lg font-medium">Nenhuma duplicata disponível</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Continue abrindo pacotes para conseguir cartas duplicadas!
            </p>
          </div>
        ) : (
          <>
            {/* Info de bônus */}
            <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm flex-shrink-0">
              <div className="flex items-start sm:items-center gap-2 text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <strong>Dica:</strong> Recicle 5+ cartas para +25% XP, ou 10+ para +50% XP!
                </span>
              </div>
            </div>

            {/* Lista de cartas com scroll */}
            <div className="overflow-y-auto max-h-[35vh] sm:max-h-[45vh] -mx-4 sm:-mx-6 px-4 sm:px-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              <div className="space-y-2 sm:space-y-3 py-2">
                {recyclableCards.map(userCard => {
                  const card = userCard.card!;
                  const maxRecyclable = userCard.quantity - 1;
                  const selected = selections.get(userCard.card_id) || 0;
                  const xpValue = RECYCLE_XP_VALUES[card.rarity];

                  return (
                    <div
                      key={userCard.card_id}
                      className={cn(
                        "rounded-lg border transition-colors p-2.5 sm:p-3",
                        selected > 0 
                          ? "border-orange-500/50 bg-orange-500/10" 
                          : "border-border bg-card"
                      )}
                    >
                      {/* Mobile: Stacked layout / Desktop: Horizontal */}
                      <div className="flex items-center gap-2 sm:gap-4">
                        <CardDisplay card={card} size="xs" showStats={false} />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{card.name}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0">
                              {RARITY_LABELS[card.rarity]}
                            </Badge>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">
                              {xpValue} XP/carta
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                            Você tem: {userCard.quantity} (pode reciclar até {maxRecyclable})
                          </p>
                        </div>

                        {/* Desktop: Vertical controls */}
                        <div className="hidden sm:flex flex-col items-end gap-2 min-w-[120px]">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Qtd:</span>
                            <span className="font-bold w-6 text-center">{selected}</span>
                          </div>
                          <Slider
                            value={[selected]}
                            onValueChange={([val]) => handleQuantityChange(userCard.card_id, val)}
                            max={maxRecyclable}
                            min={0}
                            step={1}
                            className="w-24"
                          />
                          {selected > 0 && (
                            <span className="text-xs text-orange-500 font-medium">
                              +{selected * xpValue} XP
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mobile: Horizontal controls below */}
                      <div className="flex sm:hidden items-center gap-3 mt-2 pt-2 border-t border-border/50">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {userCard.quantity}x (max {maxRecyclable})
                        </span>
                        <Slider
                          value={[selected]}
                          onValueChange={([val]) => handleQuantityChange(userCard.card_id, val)}
                          max={maxRecyclable}
                          min={0}
                          step={1}
                          className="flex-1 touch-pan-x"
                        />
                        <span className="font-bold text-sm w-6 text-center">{selected}</span>
                        {selected > 0 && (
                          <span className="text-xs text-orange-500 font-medium whitespace-nowrap">
                            +{selected * xpValue}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview e ação - sticky footer */}
            <div className="border-t pt-3 sm:pt-4 space-y-3 sm:space-y-4 flex-shrink-0 bg-background">
              {preview && (
                <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {preview.totalCards} carta(s) selecionada(s)
                      </p>
                      {preview.bonusLabel && (
                        <Badge className="mt-1 bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[10px] sm:text-xs">
                          {preview.bonusLabel}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      {preview.bonusMultiplier > 1 && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-through">
                          {preview.baseXP} XP
                        </p>
                      )}
                      <p className="text-xl sm:text-2xl font-bold text-orange-500 flex items-center gap-1">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                        {preview.totalXP} XP
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-9 sm:h-10 text-sm"
                  onClick={handleClose}
                  disabled={isRecycling}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 h-9 sm:h-10 text-sm bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  onClick={handleRecycle}
                  disabled={!preview || isRecycling}
                >
                  {isRecycling ? (
                    'Reciclando...'
                  ) : (
                    <>
                      <Flame className="w-4 h-4 mr-1.5" />
                      Reciclar {preview?.totalXP || 0} XP
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

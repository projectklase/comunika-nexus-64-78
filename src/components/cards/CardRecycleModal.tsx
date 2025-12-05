import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  const totalDuplicates = recyclableCards.reduce((sum, uc) => sum + (uc.quantity - 1), 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            Forja de Cartas
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Transforme cartas duplicadas em XP! Você sempre mantém pelo menos 1 cópia.
          </p>
        </DialogHeader>

        {recyclableCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Nenhuma duplicata disponível</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Continue abrindo pacotes para conseguir cartas duplicadas!
            </p>
          </div>
        ) : (
          <>
            {/* Info de bônus */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>
                  <strong>Dica:</strong> Recicle 5+ cartas para +25% XP, ou 10+ para +50% XP!
                </span>
              </div>
            </div>

            {/* Lista de cartas */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-3 py-2">
                {recyclableCards.map(userCard => {
                  const card = userCard.card!;
                  const maxRecyclable = userCard.quantity - 1;
                  const selected = selections.get(userCard.card_id) || 0;
                  const xpValue = RECYCLE_XP_VALUES[card.rarity];

                  return (
                    <div
                      key={userCard.card_id}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                        selected > 0 
                          ? "border-orange-500/50 bg-orange-500/10" 
                          : "border-border bg-card"
                      )}
                    >
                      <CardDisplay card={card} size="xs" showStats={false} />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{card.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {RARITY_LABELS[card.rarity]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {xpValue} XP/carta
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Você tem: {userCard.quantity} (pode reciclar até {maxRecyclable})
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 min-w-[120px]">
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
                  );
                })}
              </div>
            </ScrollArea>

            {/* Preview e ação */}
            <div className="border-t pt-4 space-y-4">
              {preview && (
                <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {preview.totalCards} carta(s) selecionada(s)
                      </p>
                      {preview.bonusLabel && (
                        <Badge className="mt-1 bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                          {preview.bonusLabel}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      {preview.bonusMultiplier > 1 && (
                        <p className="text-xs text-muted-foreground line-through">
                          {preview.baseXP} XP
                        </p>
                      )}
                      <p className="text-2xl font-bold text-orange-500 flex items-center gap-1">
                        <Sparkles className="w-5 h-5" />
                        {preview.totalXP} XP
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={isRecycling}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  onClick={handleRecycle}
                  disabled={!preview || isRecycling}
                >
                  {isRecycling ? (
                    'Reciclando...'
                  ) : (
                    <>
                      <Flame className="w-4 h-4 mr-2" />
                      Reciclar por {preview?.totalXP || 0} XP
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

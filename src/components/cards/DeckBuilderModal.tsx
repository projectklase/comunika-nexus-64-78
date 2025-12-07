import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, Deck } from '@/types/cards';
import { CardDisplay } from './CardDisplay';
import { CardDetailModal } from './CardDetailModal';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Minus, Trash2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DeckBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  allCards: Card[];
  userCards: Map<string, number>; // cardId -> quantity
  existingDeck?: Deck;
  onSave: (deckData: { name: string; description?: string; card_ids: string[] }) => void;
}

export const DeckBuilderModal = ({ 
  isOpen, 
  onClose, 
  allCards, 
  userCards,
  existingDeck,
  onSave 
}: DeckBuilderModalProps) => {
  const [deckName, setDeckName] = useState(existingDeck?.name || '');
  const [deckDescription, setDeckDescription] = useState(existingDeck?.description || '');
  const [selectedCards, setSelectedCards] = useState<string[]>(existingDeck?.card_ids || []);
  const [search, setSearch] = useState('');
  const [detailCard, setDetailCard] = useState<Card | null>(null);

  const availableCards = useMemo(() => {
    return allCards.filter(card => 
      userCards.has(card.id) && 
      card.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [allCards, userCards, search]);

  const getCardCountInDeck = (cardId: string) => {
    return selectedCards.filter(id => id === cardId).length;
  };

  const canAddCard = (cardId: string) => {
    const inDeck = getCardCountInDeck(cardId);
    const owned = userCards.get(cardId) || 0;
    return inDeck < 2 && inDeck < owned && selectedCards.length < 15;
  };

  const handleAddCard = (cardId: string) => {
    if (canAddCard(cardId)) {
      setSelectedCards([...selectedCards, cardId]);
    } else if (selectedCards.length >= 15) {
      toast.error('Máximo de 15 cartas por deck (Duelo Direto)');
    } else if (getCardCountInDeck(cardId) >= 2) {
      toast.error('Máximo de 2 cópias da mesma carta');
    }
  };

  const handleRemoveCard = (cardId: string) => {
    const idx = selectedCards.findIndex(id => id === cardId);
    if (idx !== -1) {
      const newCards = [...selectedCards];
      newCards.splice(idx, 1);
      setSelectedCards(newCards);
    }
  };

  const handleSave = () => {
    if (!deckName.trim()) {
      toast.error('Digite um nome para o deck');
      return;
    }

    if (selectedCards.length < 5) {
      toast.error('Deck deve ter no mínimo 5 cartas');
      return;
    }

    onSave({
      name: deckName,
      description: deckDescription || undefined,
      card_ids: selectedCards
    });
    onClose();
  };

  const uniqueCards = useMemo(() => {
    const uniqueIds = Array.from(new Set(selectedCards));
    return uniqueIds.map(id => {
      const card = allCards.find(c => c.id === id);
      return { card, count: getCardCountInDeck(id) };
    }).filter(item => item.card);
  }, [selectedCards, allCards]);

  const totalAtk = uniqueCards.reduce((sum, item) => sum + (item.card!.atk * item.count), 0);
  const totalDef = uniqueCards.reduce((sum, item) => sum + (item.card!.def * item.count), 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn(
          // Mobile: fullscreen - sobrescrever posição do Radix
          "w-full h-[100dvh] max-w-none rounded-none p-0",
          "left-0 top-0 translate-x-0 translate-y-0",
          // Desktop: modal centralizado
          "sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:max-w-6xl sm:h-[85vh] sm:rounded-lg sm:p-6",
          "flex flex-col"
        )}>
          <DialogHeader className="px-3 pt-3 sm:px-0 sm:pt-0 flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">
              {existingDeck ? 'Editar Deck' : 'Novo Deck'}
            </DialogTitle>
          </DialogHeader>

          {/* Nome do deck */}
          <div className="px-3 sm:px-0 flex-shrink-0 space-y-1">
            <Label className="text-xs sm:text-sm">Nome do Deck</Label>
            <Input
              placeholder="Meu Deck Épico"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className="h-10 sm:h-11"
            />
          </div>

          {/* Layout principal */}
          <div className="flex-1 flex flex-col sm:grid sm:grid-cols-[1fr,300px] gap-3 sm:gap-4 overflow-hidden">
            
            {/* Coleção disponível - scrollable */}
            <div className="flex-1 overflow-hidden flex flex-col px-3 sm:px-0">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cartas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 pb-4">
                  {availableCards.map(card => {
                    const inDeck = getCardCountInDeck(card.id);
                    const owned = userCards.get(card.id) || 0;
                    
                    return (
                      <div key={card.id} className="relative group">
                        <CardDisplay
                          card={card}
                          size="xs"
                          className="cursor-pointer"
                          onClick={() => handleAddCard(card.id)}
                        />
                        
                        {/* Botão de info para ver detalhes */}
                        <button
                          className="absolute top-1 right-1 p-1.5 sm:p-1 rounded-full bg-background/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 min-w-[28px] min-h-[28px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailCard(card);
                          }}
                        >
                          <Info className="w-3 h-3" />
                        </button>
                        
                        <div className="absolute -top-1 -left-1 space-y-0.5">
                          {inDeck > 0 && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                              {inDeck}x
                            </Badge>
                          )}
                          <div className="text-[10px] text-muted-foreground bg-background/90 rounded px-1">
                            {inDeck}/{owned}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Deck atual - fixed bottom em mobile */}
            <div className={cn(
              // Mobile: fixed bottom, 30% da tela
              "fixed bottom-0 left-0 right-0 h-[30vh] bg-background border-t p-3 z-50",
              // Desktop: relative sidebar
              "sm:relative sm:bottom-auto sm:left-auto sm:right-auto sm:h-auto sm:border-l sm:border-t-0 sm:pl-4 sm:z-auto",
              "flex flex-col"
            )}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-base font-bold">{selectedCards.length}/15 cartas</h3>
                <Badge variant={selectedCards.length >= 5 ? 'default' : 'destructive'} className="text-[10px] sm:text-xs">
                  {selectedCards.length >= 5 ? 'Válido' : 'Mín. 5'}
                </Badge>
              </div>

              {/* Stats compactos */}
              <div className="grid grid-cols-2 gap-2 mb-2 text-xs sm:text-sm">
                <div className="p-1.5 sm:p-2 rounded bg-orange-500/10">
                  <p className="text-muted-foreground text-[10px]">ATK</p>
                  <p className="font-bold">{totalAtk}</p>
                </div>
                <div className="p-1.5 sm:p-2 rounded bg-blue-500/10">
                  <p className="text-muted-foreground text-[10px]">DEF</p>
                  <p className="font-bold">{totalDef}</p>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-1.5 sm:space-y-2">
                  {uniqueCards.map(({ card, count }) => card && (
                    <div 
                      key={card.id} 
                      className="flex items-center gap-2 p-1.5 sm:p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setDetailCard(card)}
                    >
                      <CardDisplay card={card} size="xs" className="w-10 h-14 sm:w-16 sm:h-20" showStats={false} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold truncate">{card.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {card.atk}/{card.def}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 sm:h-6 sm:w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCard(card.id);
                          }}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-center text-xs sm:text-sm font-bold min-w-[16px]">{count}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 sm:h-6 sm:w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCard(card.id);
                          }}
                          disabled={!canAddCard(card.id)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Ações do deck em mobile */}
              <div className="flex gap-2 mt-2 sm:mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCards([])}
                  disabled={selectedCards.length === 0}
                  className="flex-1 sm:flex-none h-9 sm:h-8 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1 sm:mr-2" />
                  Limpar
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={selectedCards.length < 5}
                  className="flex-1 h-9 sm:hidden text-xs"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>

          {/* Footer - apenas desktop */}
          <DialogFooter className="hidden sm:flex px-0 pt-3 flex-shrink-0">
            <Button variant="outline" onClick={onClose} className="h-10">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={selectedCards.length < 5} className="h-10">
              Salvar Deck
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Detail Modal */}
      <CardDetailModal
        card={detailCard}
        isOpen={!!detailCard}
        onClose={() => setDetailCard(null)}
        quantity={detailCard ? userCards.get(detailCard.id) : undefined}
      />
    </>
  );
};
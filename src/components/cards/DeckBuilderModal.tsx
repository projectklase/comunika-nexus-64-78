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
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {existingDeck ? 'Editar Deck' : 'Novo Deck'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-[1fr,300px] gap-4 flex-1 overflow-hidden">
            {/* Lado Esquerdo: Seleção de Cartas */}
            <div className="flex flex-col gap-3 overflow-hidden">
              <div className="space-y-2">
                <Label>Nome do Deck</Label>
                <Input
                  placeholder="Meu Deck Épico"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                />
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cartas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="flex-1">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 pb-4">
                  {availableCards.map(card => {
                    const inDeck = getCardCountInDeck(card.id);
                    const owned = userCards.get(card.id) || 0;
                    
                    return (
                      <div key={card.id} className="relative group">
                        <CardDisplay
                          card={card}
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => handleAddCard(card.id)}
                        />
                        
                        {/* Botão de info para ver detalhes */}
                        <button
                          className="absolute top-1 right-1 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailCard(card);
                          }}
                        >
                          <Info className="w-3 h-3" />
                        </button>
                        
                        <div className="absolute -top-2 -left-2 space-y-1">
                          {inDeck > 0 && (
                            <Badge className="bg-primary text-primary-foreground">
                              {inDeck}x
                            </Badge>
                          )}
                          <div className="text-xs text-muted-foreground bg-background/90 rounded px-1">
                            {inDeck}/{owned}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Lado Direito: Deck Atual */}
            <div className="border-l pl-4 flex flex-col gap-3 overflow-hidden">
              <div>
                <h3 className="font-semibold mb-2">Deck Atual</h3>
                <div className="flex items-center justify-between text-sm">
                  <span>{selectedCards.length}/15 cartas</span>
                  <Badge variant={selectedCards.length >= 5 ? 'default' : 'destructive'}>
                    {selectedCards.length >= 5 ? 'Válido' : 'Mín. 5'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded bg-orange-500/10">
                  <p className="text-muted-foreground text-xs">ATK Total</p>
                  <p className="font-bold">{totalAtk}</p>
                </div>
                <div className="p-2 rounded bg-blue-500/10">
                  <p className="text-muted-foreground text-xs">DEF Total</p>
                  <p className="font-bold">{totalDef}</p>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {uniqueCards.map(({ card, count }) => card && (
                    <div 
                      key={card.id} 
                      className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setDetailCard(card)}
                    >
                      <CardDisplay card={card} size="sm" className="w-16 h-20" showStats={false} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{card.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {card.atk} ATK / {card.def} DEF
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCard(card.id);
                          }}
                          disabled={!canAddCard(card.id)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <span className="text-center text-sm font-bold">{count}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCard(card.id);
                          }}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCards([])}
                disabled={selectedCards.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Deck
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={selectedCards.length < 5}>
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
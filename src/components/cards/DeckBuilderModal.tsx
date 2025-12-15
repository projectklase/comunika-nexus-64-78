import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, Deck } from '@/types/cards';
import { CardDisplay } from './CardDisplay';
import { CardDetailModal } from './CardDetailModal';
import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Plus, X, Swords, Shield, Trash2, Sparkles } from 'lucide-react';
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
  
  // Flip sound ref
  const flipSoundRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    flipSoundRef.current = new Audio('/sounds/card-flipping.mp3');
    flipSoundRef.current.volume = 0.5;
    
    return () => {
      if (flipSoundRef.current) {
        flipSoundRef.current.pause();
        flipSoundRef.current = null;
      }
    };
  }, []);

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
      // Play flip sound
      if (flipSoundRef.current) {
        flipSoundRef.current.currentTime = 0;
        flipSoundRef.current.play().catch(() => {});
      }
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

  const isValidDeck = selectedCards.length >= 5;
  const emptySlots = Math.max(0, 5 - selectedCards.length);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn(
          // Mobile: fullscreen
          "w-full h-[100dvh] max-w-none rounded-none p-0",
          "left-0 top-0 translate-x-0 translate-y-0",
          // Desktop: modal centralizado
          "sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:max-w-5xl sm:h-[90vh] sm:rounded-xl",
          "flex flex-col overflow-hidden",
          "bg-gradient-to-b from-background via-background to-purple-950/20"
        )}>
          {/* Premium Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-900/80 via-purple-800/60 to-purple-900/80 border-b border-purple-500/30 px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                    DECK BUILDER
                  </h1>
                  <p className="text-[10px] sm:text-xs text-purple-300/70">
                    {existingDeck ? 'Editando deck' : 'Crie seu deck épico'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/10 hover:bg-white/20"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
            
            {/* Nome do deck inline */}
            <div className="mt-3 relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <Input
                placeholder="Nome do seu deck épico..."
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="pl-10 h-10 sm:h-11 bg-black/30 border-purple-500/30 placeholder:text-purple-300/40 focus:border-purple-400 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Grid de Coleção */}
          <div className="flex-1 overflow-hidden flex flex-col px-3 sm:px-4 py-3">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cartas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-white/5 border-white/10"
              />
            </div>
            
            {/* Cards Grid - Simplified without badges */}
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-3 pb-[280px] sm:pb-4">
                {availableCards.map(card => {
                  const inDeck = getCardCountInDeck(card.id);
                  const owned = userCards.get(card.id) || 0;
                  const canAdd = canAddCard(card.id);
                  
                    return (
                      <div 
                        key={card.id} 
                        className={cn(
                          "relative transition-all duration-200 rounded-lg cursor-pointer active:scale-95",
                          // Seleção visual quando carta está no deck
                          inDeck > 0 && "ring-2 ring-emerald-500 ring-offset-1 ring-offset-background",
                          // Desativado quando limite atingido
                          !canAdd && inDeck >= owned && "opacity-40 grayscale"
                        )}
                        onClick={() => handleAddCard(card.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setDetailCard(card);
                        }}
                        onDoubleClick={() => setDetailCard(card)}
                      >
                        <div className="pointer-events-none">
                          <CardDisplay
                            card={card}
                            size="xs"
                          />
                        </div>
                        
                        {/* Badge de quantidade no deck */}
                        {inDeck > 0 && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-black shadow-lg shadow-amber-500/30 z-10">
                            {inDeck}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>

          {/* Premium Bottom Panel */}
          <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "bg-gradient-to-t from-black via-purple-950/95 to-purple-900/90",
            "border-t border-purple-500/40 backdrop-blur-xl",
            "sm:relative sm:border-t-0 sm:bg-gradient-to-r sm:from-purple-950/50 sm:via-purple-900/30 sm:to-purple-950/50"
          )}>
            {/* Drag Handle - Mobile only */}
            <div className="flex justify-center py-2 sm:hidden">
              <div className="w-12 h-1 bg-purple-500/50 rounded-full" />
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3 px-4 mb-2 sm:mb-3">
              <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    isValidDeck 
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                      : "bg-gradient-to-r from-amber-500 to-orange-500"
                  )}
                  style={{ width: `${Math.min((selectedCards.length / 15) * 100, 100)}%` }}
                />
              </div>
              <span className={cn(
                "text-sm font-bold min-w-[45px] text-right",
                isValidDeck ? "text-emerald-400" : "text-amber-400"
              )}>
                {selectedCards.length}/15
              </span>
            </div>

            {/* Stats Compactos Premium */}
            <div className="flex items-center gap-3 px-4 mb-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">ATK</p>
                  <p className="text-base sm:text-lg font-bold text-orange-400">{totalAtk}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">DEF</p>
                  <p className="text-base sm:text-lg font-bold text-blue-400">{totalDef}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCards([])}
                disabled={selectedCards.length === 0}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Limpar
              </Button>
            </div>

            {/* Horizontal Card Slots */}
            <div className="px-4 mb-3">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 pb-2 w-max">
                  {/* Cartas no deck */}
                  {uniqueCards.map(({ card, count }) => card && (
                    <div key={card.id} className="flex-shrink-0 relative group">
                      <div 
                        className="w-14 h-20 sm:w-16 sm:h-[88px] cursor-pointer"
                        onClick={() => setDetailCard(card)}
                      >
                        <CardDisplay card={card} size="xs" showStats={false} />
                      </div>
                      {/* Badge de quantidade */}
                      {count > 1 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg">
                          x{count}
                        </div>
                      )}
                      {/* Botão remover */}
                      <button
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCard(card.id);
                        }}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Slots vazios */}
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <div 
                      key={`empty-${i}`} 
                      className="flex-shrink-0 w-14 h-20 sm:w-16 sm:h-[88px] border-2 border-dashed border-purple-500/30 rounded-lg flex items-center justify-center bg-purple-500/5"
                    >
                      <Plus className="w-4 h-4 text-purple-500/40" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Botão Salvar Premium */}
            <div className="px-4 pb-4 sm:pb-4">
              <Button
                onClick={handleSave}
                disabled={!isValidDeck || !deckName.trim()}
                className={cn(
                  "w-full h-11 sm:h-12 text-sm sm:text-base font-bold transition-all duration-300",
                  isValidDeck && deckName.trim()
                    ? "bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 hover:from-purple-500 hover:via-pink-400 hover:to-purple-500 shadow-lg shadow-purple-500/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Swords className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {!deckName.trim() 
                  ? "Digite o nome do deck" 
                  : isValidDeck 
                    ? "SALVAR DECK" 
                    : `Faltam ${5 - selectedCards.length} carta${5 - selectedCards.length !== 1 ? 's' : ''}`
                }
              </Button>
            </div>
          </div>
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

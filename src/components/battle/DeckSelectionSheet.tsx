import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCards } from '@/hooks/useCards';
import { Star, Swords } from 'lucide-react';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeckSelectionSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectDeck: (deckId: string) => void;
}

export function DeckSelectionSheet({ open, onClose, onSelectDeck }: DeckSelectionSheetProps) {
  const { decks } = useCards();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedDeckId) {
      onSelectDeck(selectedDeckId);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] sm:h-auto sm:max-w-2xl sm:mx-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-2xl">
            <Swords className="h-6 w-6 text-primary" />
            Escolha seu Deck
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(80vh-180px)] sm:h-auto sm:max-h-[60vh] pr-4 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {decks.map((deck) => (
              <Card
                key={deck.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  selectedDeckId === deck.id
                    ? 'border-primary border-2 bg-primary/5'
                    : 'border-border'
                }`}
                onClick={() => setSelectedDeckId(deck.id)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate flex items-center gap-2">
                        {deck.name}
                        {deck.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      </h3>
                      {deck.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {deck.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {deck.card_ids.length} cartas
                    </Badge>
                    {deck.is_active && (
                      <Badge variant="default" className="text-xs">
                        Ativo
                      </Badge>
                    )}
                  </div>

                  {selectedDeckId === deck.id && (
                    <div className="pt-2 border-t border-primary/20">
                      <p className="text-sm text-primary font-medium">✓ Deck Selecionado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {decks.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="text-muted-foreground">
                Você ainda não possui nenhum deck.
              </div>
              <p className="text-sm text-muted-foreground">
                Crie um deck primeiro para poder batalhar!
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDeckId}
            className="flex-1"
          >
            <Swords className="h-4 w-4 mr-2" />
            Procurar Partida
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

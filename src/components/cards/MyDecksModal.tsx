import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardDisplay } from './CardDisplay';
import { Swords, Star, Pencil, Trash2, Plus, Layers } from 'lucide-react';
import { Deck, Card } from '@/types/cards';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MyDecksModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  allCards: Card[];
  onEditDeck: (deck: Deck) => void;
  onDeleteDeck: (deck: Deck) => void;
  onCreateNew: () => void;
}

export function MyDecksModal({
  isOpen,
  onClose,
  decks,
  allCards,
  onEditDeck,
  onDeleteDeck,
  onCreateNew
}: MyDecksModalProps) {
  const getCardById = (cardId: string) => allCards.find(c => c.id === cardId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-24px)] max-w-2xl h-[85vh] sm:h-auto sm:max-h-[80vh] p-0 overflow-hidden bg-gradient-to-b from-background via-background to-purple-950/20 border-purple-500/30">
        {/* Header Premium */}
        <DialogHeader className="relative p-4 sm:p-6 pb-3 sm:pb-4 bg-gradient-to-r from-purple-900/40 via-violet-900/40 to-purple-900/40 border-b border-purple-500/20">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
          <div className="relative flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30">
              <Swords className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-200 to-violet-200 bg-clip-text text-transparent">
                MEUS DECKS
              </DialogTitle>
              <p className="text-xs sm:text-sm text-purple-300/70">
                {decks.length}/10 decks criados
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo */}
        <ScrollArea className="flex-1 h-[calc(85vh-180px)] sm:h-auto sm:max-h-[50vh]">
          <div className="p-4 sm:p-6 space-y-3">
            {decks.length === 0 ? (
              /* Estado Vazio */
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                  <Layers className="w-10 h-10 text-purple-400/50" />
                </div>
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Nenhum deck criado ainda
                </h3>
                <p className="text-sm text-muted-foreground/70 mb-6 max-w-xs">
                  Crie seu primeiro deck para batalhar na Arena!
                </p>
                <Button 
                  onClick={onCreateNew}
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Deck
                </Button>
              </motion.div>
            ) : (
              /* Lista de Decks */
              <AnimatePresence mode="popLayout">
                {decks.map((deck, index) => (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "group relative rounded-xl overflow-hidden",
                      "bg-gradient-to-br from-purple-900/30 to-violet-900/30",
                      "border border-purple-500/20 hover:border-purple-400/40",
                      "transition-all duration-200",
                      deck.is_favorite && "ring-2 ring-amber-400/50"
                    )}
                  >
                    {/* Header do Deck */}
                    <div className="flex items-center justify-between p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        {deck.is_favorite && (
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm sm:text-base truncate">{deck.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {deck.card_ids.length}/15 cartas
                          </p>
                        </div>
                      </div>
                      
                      {/* Botões de Ação */}
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-purple-500/20 hover:text-purple-300"
                          onClick={() => onEditDeck(deck)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-red-500/20 hover:text-red-400"
                          onClick={() => onDeleteDeck(deck)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Preview das Cartas */}
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
                        {deck.card_ids.slice(0, 6).map((cardId, cardIdx) => {
                          const card = getCardById(cardId);
                          return card ? (
                            <div 
                              key={`${cardId}-${cardIdx}`} 
                              className="flex-shrink-0 w-12 sm:w-14"
                            >
                              <CardDisplay 
                                card={card} 
                                size="xs" 
                                showStats={false}
                                className="pointer-events-none"
                              />
                            </div>
                          ) : null;
                        })}
                        {deck.card_ids.length > 6 && (
                          <div className="flex-shrink-0 w-12 sm:w-14 h-16 sm:h-20 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <span className="text-xs text-purple-300">
                              +{deck.card_ids.length - 6}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {decks.length > 0 && decks.length < 10 && (
          <div className="p-4 sm:p-6 pt-0 border-t border-purple-500/20 bg-background/50">
            <Button 
              onClick={onCreateNew}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 h-11"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Deck
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card, CardRarity, CardCategory, RARITY_LABELS, CATEGORY_LABELS } from '@/types/cards';
import { CardDisplay } from './CardDisplay';
import { CardDetailModal } from './CardDetailModal';
import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CardGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  userCards: Map<string, number>; // cardId -> quantity
}

export const CardGalleryModal = ({ isOpen, onClose, cards, userCards }: CardGalleryModalProps) => {
  const [search, setSearch] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<CardRarity | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<CardCategory | 'ALL'>('ALL');
  const [detailCard, setDetailCard] = useState<Card | null>(null);

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const matchesSearch = card.name.toLowerCase().includes(search.toLowerCase());
      const matchesRarity = selectedRarity === 'ALL' || card.rarity === selectedRarity;
      const matchesCategory = selectedCategory === 'ALL' || card.category === selectedCategory;
      return matchesSearch && matchesRarity && matchesCategory;
    });
  }, [cards, search, selectedRarity, selectedCategory]);

  const rarities: (CardRarity | 'ALL')[] = ['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'];
  const categories: (CardCategory | 'ALL')[] = ['ALL', 'MATEMATICA', 'CIENCIAS', 'HISTORIA', 'ARTES', 'ESPORTES', 'ESPECIAL'];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn(
          // Mobile: fullscreen - sobrescrever posição do Radix
          "w-full h-[100dvh] max-w-none rounded-none p-0",
          "left-0 top-0 translate-x-0 translate-y-0",
          // Desktop: modal centralizado
          "sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:max-w-6xl sm:h-[80vh] sm:rounded-lg sm:p-6",
          "flex flex-col"
        )}>
          {/* Header */}
          <DialogHeader className="px-3 pt-3 sm:px-0 sm:pt-0 flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">Galeria de Cartas</DialogTitle>
          </DialogHeader>

          {/* Busca fixa no topo */}
          <div className="px-3 sm:px-0 py-2 sm:py-0 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cartas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="px-3 sm:px-0 space-y-2 sm:space-y-3 flex-shrink-0">
            {/* Filtro de Raridade */}
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm text-muted-foreground">Raridade</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {rarities.map(rarity => (
                  <Badge
                    key={rarity}
                    variant={selectedRarity === rarity ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1"
                    onClick={() => setSelectedRarity(rarity)}
                  >
                    {rarity === 'ALL' ? 'Todas' : RARITY_LABELS[rarity]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Filtro de Categoria */}
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm text-muted-foreground">Categoria</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {categories.map(category => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'ALL' ? 'Todas' : CATEGORY_LABELS[category]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Grid de Cartas */}
          <ScrollArea className="flex-1 px-3 sm:px-0 mt-2 sm:mt-0">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 pb-4">
              {filteredCards.map(card => (
                <CardDisplay
                  key={card.id}
                  card={card}
                  size="xs"
                  quantity={userCards.get(card.id)}
                  onClick={() => setDetailCard(card)}
                  className={cn(!userCards.has(card.id) && 'opacity-50 grayscale')}
                />
              ))}
            </div>
            
            {filteredCards.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhuma carta encontrada
              </div>
            )}
          </ScrollArea>

          {/* Footer com estatísticas */}
          <div className="px-3 sm:px-0 py-2 sm:py-3 border-t text-xs sm:text-sm text-muted-foreground flex-shrink-0">
            <div className="flex items-center justify-between">
              <span>Total: {filteredCards.length} cartas</span>
              <span>Coleção: {userCards.size}/{cards.length}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <CardDetailModal
        card={detailCard}
        isOpen={!!detailCard}
        onClose={() => setDetailCard(null)}
        quantity={detailCard ? userCards.get(detailCard.id) : undefined}
      />
    </>
  );
};

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
        <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Galeria de Cartas</DialogTitle>
          </DialogHeader>

          {/* Filtros */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cartas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro de Raridade */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Raridade</p>
              <div className="flex flex-wrap gap-2">
                {rarities.map(rarity => (
                  <Badge
                    key={rarity}
                    variant={selectedRarity === rarity ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedRarity(rarity)}
                  >
                    {rarity === 'ALL' ? 'Todas' : RARITY_LABELS[rarity]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Filtro de Categoria */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Categoria</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'ALL' ? 'Todas' : CATEGORY_LABELS[category]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Grid de Cartas */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4">
              {filteredCards.map(card => (
                <CardDisplay
                  key={card.id}
                  card={card}
                  quantity={userCards.get(card.id)}
                  onClick={() => setDetailCard(card)}
                  className={cn(!userCards.has(card.id) && 'opacity-50 grayscale')}
                />
              ))}
            </div>
            
            {filteredCards.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma carta encontrada
              </div>
            )}
          </ScrollArea>

          {/* Estatísticas */}
          <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
            <span>Total: {filteredCards.length} cartas</span>
            <span>Coleção: {userCards.size}/{cards.length}</span>
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

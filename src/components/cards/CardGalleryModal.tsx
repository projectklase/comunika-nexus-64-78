import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card, CardRarity, CardCategory, RARITY_LABELS, CATEGORY_LABELS } from '@/types/cards';
import { CardDisplay } from './CardDisplay';
import { CardDetailModal } from './CardDetailModal';
import { useState, useMemo } from 'react';
import { Search, Lock, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [showFilters, setShowFilters] = useState(false);
  const [showFiltersDesktop, setShowFiltersDesktop] = useState(false);

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

  const activeFiltersCount = (selectedRarity !== 'ALL' ? 1 : 0) + (selectedCategory !== 'ALL' ? 1 : 0);

  const FiltersContent = () => (
    <>
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
    </>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn(
          // Mobile: fullscreen (INTOCADO)
          "w-full h-[100dvh] max-w-none rounded-none p-0",
          "left-0 top-0 translate-x-0 translate-y-0",
          // Desktop/Tablet: tela cheia também
          "sm:w-[100vw] sm:h-[100dvh] sm:max-w-none sm:rounded-none",
          "sm:left-0 sm:top-0 sm:translate-x-0 sm:translate-y-0 sm:p-6",
          "flex flex-col overflow-hidden sm:!overflow-hidden"
        )}>
          {/* Header */}
          <DialogHeader className="px-3 pt-3 sm:px-0 sm:pt-0 flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">
              Galeria de Cartas
            </DialogTitle>
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

          {/* Mobile: Filtros colapsáveis + Contador */}
          <div className="px-3 sm:hidden flex-shrink-0 flex items-center justify-between gap-2">
            <Collapsible open={showFilters} onOpenChange={setShowFilters} className="flex-1">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full max-w-[180px] justify-between h-9"
                >
                  <span className="text-xs">
                    Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                  </span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    showFilters && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
            
            {/* Contador de cartas - alinhado à direita */}
            <Badge variant="secondary" className="text-xs font-medium px-3 py-1.5 h-9 flex items-center whitespace-nowrap">
              {userCards.size}/{cards.length} 🃏
            </Badge>
          </div>
          
          {/* Mobile: Conteúdo colapsável dos filtros */}
          <div className="px-3 sm:hidden">
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleContent className="pt-2 space-y-2">
                <FiltersContent />
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Desktop/Tablet: Filtros colapsáveis com botão glassmórfico */}
          <div className="hidden sm:flex sm:items-center sm:gap-4 px-0 py-3 flex-shrink-0">
            <Collapsible open={showFiltersDesktop} onOpenChange={setShowFiltersDesktop} className="flex-1">
              <div className="flex items-center gap-3">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline"
                    className={cn(
                      "bg-white/10 backdrop-blur-md border-white/20",
                      "hover:bg-white/20 hover:border-white/30",
                      "text-foreground font-medium px-5 py-2.5 h-10",
                      "transition-all duration-200"
                    )}
                  >
                    <span>Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
                    <ChevronDown className={cn(
                      "w-4 h-4 ml-2 transition-transform duration-200",
                      showFiltersDesktop && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                
                {/* Badges de filtros ativos */}
                {selectedRarity !== 'ALL' && (
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {RARITY_LABELS[selectedRarity]}
                  </Badge>
                )}
                {selectedCategory !== 'ALL' && (
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    {CATEGORY_LABELS[selectedCategory]}
                  </Badge>
                )}
              </div>
              
              <CollapsibleContent className="pt-4">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 space-y-3">
                  <FiltersContent />
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Contador de cartas */}
            <Badge variant="secondary" className="text-sm font-medium px-4 py-2 whitespace-nowrap">
              {userCards.size}/{cards.length} 🃏
            </Badge>
          </div>

          {/* Grid de Cartas */}
          <ScrollArea className="flex-1 px-3 sm:px-0 mt-2 sm:mt-0">
            <div className="w-full max-w-full overflow-hidden">
              <div className={cn(
                "grid gap-2 sm:gap-4 pb-4",
                "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
                "w-full max-w-[100vw]",
                "mx-auto place-items-center"
              )}>
                {filteredCards.map(card => {
                  const isOwned = userCards.has(card.id);
                  return (
                    <div 
                      key={card.id} 
                      className={cn(
                        "relative aspect-[7/11]",
                        "w-full min-w-0",
                        "max-w-[180px]"
                      )}
                    >
                      <CardDisplay
                        card={card}
                        size="sm"
                        quantity={userCards.get(card.id)}
                        onClick={() => setDetailCard(card)}
                        className={cn(
                          "w-full h-full",
                          !isOwned && 'opacity-30 grayscale'
                        )}
                      />
                      {!isOwned && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black/50 rounded-full p-2">
                            <Lock className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
              <span>Exibindo: {filteredCards.length} cartas</span>
              <span className="hidden sm:inline">Coleção: {userCards.size}/{cards.length}</span>
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

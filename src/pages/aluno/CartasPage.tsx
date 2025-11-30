import { useState } from 'react';
import { useCards } from '@/hooks/useCards';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardGalleryModal } from '@/components/cards/CardGalleryModal';
import { PackOpeningModal } from '@/components/cards/PackOpeningModal';
import { DeckBuilderModal } from '@/components/cards/DeckBuilderModal';
import { CardDisplay } from '@/components/cards/CardDisplay';
import { Package, BookOpen, Plus, Sparkles, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function CartasPage() {
  const { user } = useAuth();
  const { 
    allCards, 
    userCards, 
    decks,
    openPack, 
    isOpeningPack,
    claimFreePack,
    isClaimingFreePack,
    hasClaimedFreePack,
    createDeck,
    updateDeck,
    getTotalCards,
    getUniqueCards,
    getCollectionProgress
  } = useCards();

  const [showGallery, setShowGallery] = useState(false);
  const [showPackOpening, setShowPackOpening] = useState(false);
  const [showDeckBuilder, setShowDeckBuilder] = useState(false);
  const [lastOpenedCards, setLastOpenedCards] = useState<any>(null);

  const userCardsMap = new Map(userCards.map(uc => [uc.card_id, uc.quantity]));
  const collectionProgress = getCollectionProgress();

  const handleOpenPack = (packType: any) => {
    openPack(packType, {
      onSuccess: (result) => {
        setLastOpenedCards(result.cards_received);
      }
    });
  };

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sistema de Cartas</h1>
            <p className="text-muted-foreground">
              Colecione, construa decks e batalhe!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <span className="text-xl font-bold">{user?.total_xp || 0} XP</span>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UICard>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Coleção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{getUniqueCards()}/{allCards.length}</p>
                <p className="text-xs text-muted-foreground">
                  {collectionProgress.percentage}% completo
                </p>
              </div>
            </CardContent>
          </UICard>

          <UICard>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total de Cartas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{getTotalCards()}</p>
              <p className="text-xs text-muted-foreground">Incluindo duplicatas</p>
            </CardContent>
          </UICard>

          <UICard>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Decks Criados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{decks.length}</p>
              <p className="text-xs text-muted-foreground">Máx. 10 decks</p>
            </CardContent>
          </UICard>

          <UICard className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Nível</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">Nv. {Math.floor((user?.total_xp || 0) / 100)}</p>
              <p className="text-xs text-muted-foreground">
                {(user?.total_xp || 0) % 100}/100 XP
              </p>
            </CardContent>
          </UICard>
        </div>

        {/* Ações Rápidas */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Button
            size="lg"
            variant="outline"
            className="h-auto flex-col gap-2 p-6"
            onClick={() => setShowPackOpening(true)}
          >
            <Package className="w-8 h-8" />
            <div className="text-center">
              <p className="font-semibold">Abrir Pacotes</p>
              <p className="text-xs text-muted-foreground">Obter novas cartas</p>
            </div>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-auto flex-col gap-2 p-6"
            onClick={() => setShowGallery(true)}
          >
            <BookOpen className="w-8 h-8" />
            <div className="text-center">
              <p className="font-semibold">Ver Coleção</p>
              <p className="text-xs text-muted-foreground">{getUniqueCards()} cartas</p>
            </div>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-auto flex-col gap-2 p-6"
            onClick={() => setShowDeckBuilder(true)}
          >
            <Plus className="w-8 h-8" />
            <div className="text-center">
              <p className="font-semibold">Novo Deck</p>
              <p className="text-xs text-muted-foreground">Criar estratégia</p>
            </div>
          </Button>
        </div>

        {/* Meus Decks */}
        {decks.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Meus Decks</h2>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {decks.map(deck => (
                  <UICard key={deck.id} className="min-w-[250px] cursor-pointer hover:border-primary transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="truncate">{deck.name}</span>
                        {deck.is_favorite && <Badge variant="secondary">★</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {deck.card_ids.length} cartas
                      </p>
                      <div className="grid grid-cols-5 gap-1">
                        {deck.card_ids.slice(0, 5).map((cardId, idx) => {
                          const card = allCards.find(c => c.id === cardId);
                          return card ? (
                            <CardDisplay key={idx} card={card} size="sm" showStats={false} />
                          ) : null;
                        })}
                      </div>
                    </CardContent>
                  </UICard>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Cartas Recentes */}
        {userCards.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Cartas Recentes</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {userCards.slice(0, 8).map(uc => uc.card && (
                <CardDisplay 
                  key={uc.id} 
                  card={uc.card} 
                  quantity={uc.quantity}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      <CardGalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        cards={allCards}
        userCards={userCardsMap}
      />

      <PackOpeningModal
        isOpen={showPackOpening}
        onClose={() => {
          setShowPackOpening(false);
          setLastOpenedCards(null);
        }}
        onOpenPack={handleOpenPack}
        onClaimFreePack={() => {
          claimFreePack(undefined, {
            onSuccess: (result) => {
              setLastOpenedCards(result.cards_received);
            },
          });
        }}
        isOpening={isOpeningPack || isClaimingFreePack}
        userXP={user?.total_xp || 0}
        lastOpenedCards={lastOpenedCards}
        hasClaimedFreePack={hasClaimedFreePack}
      />

      <DeckBuilderModal
        isOpen={showDeckBuilder}
        onClose={() => setShowDeckBuilder(false)}
        allCards={allCards}
        userCards={userCardsMap}
        onSave={(deckData) => createDeck(deckData)}
      />
    </AppLayout>
  );
}

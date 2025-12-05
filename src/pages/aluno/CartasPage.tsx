import { useState, useMemo } from 'react';
import { useCards } from '@/hooks/useCards';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { CardGalleryModal } from '@/components/cards/CardGalleryModal';
import { PackOpeningModal } from '@/components/cards/PackOpeningModal';
import { DeckBuilderModal } from '@/components/cards/DeckBuilderModal';
import { CardDisplay } from '@/components/cards/CardDisplay';
import { CardDetailModal } from '@/components/cards/CardDetailModal';
import { CardRecycleModal } from '@/components/cards/CardRecycleModal';
import { GameStatCard } from '@/components/cards/GameStatCard';
import { GameActionButton } from '@/components/cards/GameActionButton';
import { GameDeckCard } from '@/components/cards/GameDeckCard';
import { Package, BookOpen, Plus, Sparkles, TrendingUp, Flame } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DeleteDeckConfirmModal } from '@/components/cards/DeleteDeckConfirmModal';
import { Deck, Card } from '@/types/cards';
import { getRecyclableCards } from '@/hooks/useCardRecycling';

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
    deleteDeck,
    isDeletingDeck,
    getTotalCards,
    getUniqueCards,
    getCollectionProgress
  } = useCards();

  const [showGallery, setShowGallery] = useState(false);
  const [showPackOpening, setShowPackOpening] = useState(false);
  const [showDeckBuilder, setShowDeckBuilder] = useState(false);
  const [showRecycleModal, setShowRecycleModal] = useState(false);
  const [lastOpenedCards, setLastOpenedCards] = useState<any>(null);
  const [editingDeck, setEditingDeck] = useState<Deck | undefined>(undefined);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const userCardsMap = new Map(userCards.map(uc => [uc.card_id, uc.quantity]));
  const collectionProgress = getCollectionProgress();
  
  // Contar duplicatas para badge
  const duplicateCount = useMemo(() => {
    return getRecyclableCards(userCards).reduce((sum, uc) => sum + (uc.quantity - 1), 0);
  }, [userCards]);

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
          <GameStatCard
            icon={<BookOpen className="w-5 h-5" />}
            title="Coleção"
            value={`${getUniqueCards()}/${allCards.length}`}
            subtitle={`${collectionProgress.percentage}% completo`}
            variant="collection"
            progress={collectionProgress.percentage}
            delay={0}
          />

          <GameStatCard
            icon={<Package className="w-5 h-5" />}
            title="Total de Cartas"
            value={getTotalCards()}
            subtitle="Incluindo duplicatas"
            variant="cards"
            delay={1}
          />

          <GameStatCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Decks Criados"
            value={decks.length}
            subtitle="Máx. 10 decks"
            variant="decks"
            delay={2}
          />

          <GameStatCard
            icon={<Sparkles className="w-5 h-5" />}
            title="Nível"
            value={`Nv. ${Math.floor((user?.total_xp || 0) / 100)}`}
            subtitle={`${(user?.total_xp || 0) % 100}/100 XP`}
            variant="level"
            progress={(user?.total_xp || 0) % 100}
            delay={3}
          />
        </div>

        {/* Ações Rápidas */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GameActionButton
            icon={<Package className="w-full h-full" />}
            title="Abrir Pacotes"
            subtitle="Obter novas cartas"
            variant="reward"
            onClick={() => setShowPackOpening(true)}
            delay={4}
          />

          <GameActionButton
            icon={<BookOpen className="w-full h-full" />}
            title="Ver Coleção"
            subtitle={`${getUniqueCards()} cartas`}
            variant="explore"
            onClick={() => setShowGallery(true)}
            delay={5}
          />

          <GameActionButton
            icon={<Plus className="w-full h-full" />}
            title="Novo Deck"
            subtitle="Criar estratégia"
            variant="create"
            onClick={() => setShowDeckBuilder(true)}
            delay={6}
          />

          <GameActionButton
            icon={<Flame className="w-full h-full" />}
            title="Forja de Cartas"
            subtitle={duplicateCount > 0 ? `${duplicateCount} duplicata(s)` : 'Sem duplicatas'}
            variant="forge"
            onClick={() => setShowRecycleModal(true)}
            delay={7}
            badge={duplicateCount > 0 ? duplicateCount : undefined}
          />
        </div>

        {/* Meus Decks */}
        {decks.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Meus Decks</h2>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {decks.map((deck, idx) => (
                  <GameDeckCard
                    key={deck.id}
                    name={deck.name}
                    cardCount={deck.card_ids.length}
                    isFavorite={deck.is_favorite}
                    onEdit={() => {
                      setEditingDeck(deck);
                      setShowDeckBuilder(true);
                    }}
                    onDelete={() => setDeckToDelete(deck)}
                    delay={idx}
                  >
                    {deck.card_ids.slice(0, 5).map((cardId, cardIdx) => {
                      const card = allCards.find(c => c.id === cardId);
                      return card ? (
                        <CardDisplay 
                          key={cardIdx} 
                          card={card} 
                          size="xs" 
                          showStats={false}
                          onClick={() => setSelectedCard(card)}
                        />
                      ) : null;
                    })}
                  </GameDeckCard>
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
                  onClick={() => setSelectedCard(uc.card!)}
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
        onClose={() => {
          setShowDeckBuilder(false);
          setEditingDeck(undefined);
        }}
        allCards={allCards}
        userCards={userCardsMap}
        existingDeck={editingDeck}
        onSave={(deckData) => {
          if (editingDeck) {
            updateDeck({ id: editingDeck.id, ...deckData });
          } else {
            createDeck(deckData);
          }
        }}
      />

      {/* Modal de Confirmação Extra para Exclusão Permanente */}
      <DeleteDeckConfirmModal
        open={!!deckToDelete}
        onOpenChange={(open) => !open && setDeckToDelete(null)}
        deckName={deckToDelete?.name || ''}
        cardCount={deckToDelete?.card_ids?.length || 0}
        onConfirm={() => {
          if (deckToDelete) {
            deleteDeck(deckToDelete.id);
            setDeckToDelete(null);
          }
        }}
        loading={isDeletingDeck}
      />

      {/* Modal de Detalhes da Carta */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        quantity={selectedCard ? userCardsMap.get(selectedCard.id) : undefined}
      />

      {/* Modal de Reciclagem de Cartas */}
      <CardRecycleModal
        isOpen={showRecycleModal}
        onClose={() => setShowRecycleModal(false)}
        userCards={userCards}
      />
    </AppLayout>
  );
}
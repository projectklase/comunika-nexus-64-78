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
import { MyDecksModal } from '@/components/cards/MyDecksModal';
import { GameStatCard } from '@/components/cards/GameStatCard';
import { GameActionButton } from '@/components/cards/GameActionButton';
import { Package, BookOpen, Plus, Sparkles, TrendingUp, Flame } from 'lucide-react';
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
  const [showMyDecks, setShowMyDecks] = useState(false);
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
      <div className="w-full space-y-4 sm:space-y-6 mx-auto lg:max-w-7xl px-0 sm:px-4 lg:px-6 py-3 sm:py-6 overflow-hidden max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2 sm:gap-0 px-3 sm:px-0">
          <div className="min-w-0 max-w-full">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Sistema de Cartas</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Colecione, construa decks e batalhe!
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
            <span className="text-base sm:text-xl font-bold">{user?.total_xp || 0} XP</span>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 px-3 sm:px-0">
          <GameStatCard
            icon={<BookOpen className="w-5 h-5" />}
            title="Coleção"
            value={`${getUniqueCards()}/${allCards.length}`}
            subtitle={`${collectionProgress.percentage}% completo`}
            variant="collection"
            progress={collectionProgress.percentage}
            delay={0}
            onClick={() => setShowGallery(true)}
          />

          <GameStatCard
            icon={<Package className="w-5 h-5" />}
            title="Total de Cartas"
            value={getTotalCards()}
            subtitle="Incluindo duplicatas"
            variant="cards"
            delay={1}
            onClick={() => setShowGallery(true)}
          />

          <GameStatCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Decks Criados"
            value={decks.length}
            subtitle="Máx. 10 decks"
            variant="decks"
            delay={2}
            onClick={() => setShowMyDecks(true)}
          />

          <GameStatCard
            icon={<Sparkles className="w-5 h-5" />}
            title="Nível"
            value={`Nv. ${Math.floor((user?.level_xp || 0) / 100)}`}
            subtitle={`${(user?.level_xp || 0) % 100}/100 XP`}
            variant="level"
            progress={(user?.level_xp || 0) % 100}
            delay={3}
          />
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 px-3 sm:px-0">
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

        {/* Cartas Recentes */}
        {userCards.length > 0 && (
          <div className="overflow-hidden max-w-full">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 px-3 sm:px-0">Cartas Recentes</h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 lg:gap-4 px-3 sm:px-0">
              {userCards.slice(0, 8).map(uc => uc.card && (
                <CardDisplay 
                  key={uc.id} 
                  card={uc.card} 
                  quantity={uc.quantity}
                  size="xs"
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

      {/* Modal Meus Decks */}
      <MyDecksModal
        isOpen={showMyDecks}
        onClose={() => setShowMyDecks(false)}
        decks={decks}
        allCards={allCards}
        onEditDeck={(deck) => {
          setShowMyDecks(false);
          setEditingDeck(deck);
          setShowDeckBuilder(true);
        }}
        onDeleteDeck={(deck) => {
          setShowMyDecks(false);
          setDeckToDelete(deck);
        }}
        onCreateNew={() => {
          setShowMyDecks(false);
          setEditingDeck(undefined);
          setShowDeckBuilder(true);
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
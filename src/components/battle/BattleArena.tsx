import { useState } from 'react';
import { useBattle } from '@/hooks/useBattle';
import { useCards } from '@/hooks/useCards';
import { BattleLine } from './BattleLine';
import { BattleBackground } from './BattleBackground';
import { BattlePlayerInfo } from './BattlePlayerInfo';
import { BattleCard } from './BattleCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Swords } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Card as CardType } from '@/types/cards';

interface BattleArenaProps {
  battleId: string;
}

export function BattleArena({ battleId }: BattleArenaProps) {
  const { battle, currentRound, isMyTurn, myPlayerNumber, playCard, finishRound, isPlaying } = useBattle(battleId);
  const { userCards } = useCards();
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  if (!battle) {
    return (
      <div className="relative flex items-center justify-center h-screen">
        <BattleBackground />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Mock HP values (will be managed by backend later)
  const player1HP = 100 - (battle.player2_rounds_won * 30);
  const player2HP = 100 - (battle.player1_rounds_won * 30);

  const handlePlayCard = () => {
    if (!selectedCard || selectedLine === null) return;
    playCard({ battleId, line: selectedLine, cardId: selectedCard.id });
    setSelectedCard(null);
    setSelectedLine(null);
  };

  const handleLineClick = (line: number) => {
    if (!isMyTurn || !selectedCard) return;
    setSelectedLine(line);
  };

  // Get available cards for player's hand (first 6 cards from user collection)
  const playerHand = userCards.slice(0, 6);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BattleBackground />
      
      <div className="container mx-auto py-8 px-4 relative z-10">
        {/* Battle Header with HP bars */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {/* Player 1 (You) */}
            <BattlePlayerInfo
              playerName="Você"
              currentHP={player1HP}
              maxHP={100}
              isPlayer={true}
            />
            
            {/* Round indicator */}
            <div className="text-center px-6">
              <div className="bg-background/80 backdrop-blur-sm border border-primary/50 rounded-lg p-4 shadow-lg">
                <Swords className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">
                  {battle.player1_rounds_won} - {battle.player2_rounds_won}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Round {battle.current_round}/3
                </p>
              </div>
            </div>
            
            {/* Player 2 (Opponent) */}
            <BattlePlayerInfo
              playerName="Oponente"
              currentHP={player2HP}
              maxHP={100}
              isPlayer={false}
            />
          </div>
          
          {/* Turn indicator */}
          {battle.status === 'IN_PROGRESS' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 max-w-md mx-auto"
            >
              <div className={`p-3 rounded-lg border-2 ${
                isMyTurn 
                  ? 'bg-primary/20 border-primary' 
                  : 'bg-muted border-border'
              }`}>
                <p className="text-center text-sm font-medium">
                  {isMyTurn ? (
                    <span className="text-primary">⚔️ É sua vez de jogar!</span>
                  ) : (
                    <span className="text-muted-foreground">⏳ Aguardando oponente...</span>
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Arena com 3 linhas */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-8"
        >
          {currentRound && (
            <>
              <BattleLine
                lineNumber={1}
                playerCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player1_cards.line1
                    : currentRound.player2_cards.line1
                }
                opponentCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player2_cards.line1
                    : currentRound.player1_cards.line1
                }
                isMyTurn={isMyTurn}
                canPlayOnLine={!!selectedCard}
                onCardClick={() => handleLineClick(1)}
              />

              <BattleLine
                lineNumber={2}
                playerCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player1_cards.line2
                    : currentRound.player2_cards.line2
                }
                opponentCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player2_cards.line2
                    : currentRound.player1_cards.line2
                }
                isMyTurn={isMyTurn}
                canPlayOnLine={!!selectedCard}
                onCardClick={() => handleLineClick(2)}
              />

              <BattleLine
                lineNumber={3}
                playerCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player1_cards.line3
                    : currentRound.player2_cards.line3
                }
                opponentCards={
                  myPlayerNumber === 'PLAYER1'
                    ? currentRound.player2_cards.line3
                    : currentRound.player1_cards.line3
                }
                isMyTurn={isMyTurn}
                canPlayOnLine={!!selectedCard}
                onCardClick={() => handleLineClick(3)}
              />
            </>
          )}
        </motion.div>

        {/* Mão do jogador */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-background/80 backdrop-blur-sm border-primary/30 p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Sua Mão</h3>
            <div className="flex gap-4 justify-center overflow-x-auto pb-2">
              {playerHand.map((userCard, index) => (
                <motion.div
                  key={userCard.card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <BattleCard
                    card={userCard.card}
                    isSelectable={isMyTurn}
                    isSelected={selectedCard?.id === userCard.card.id}
                    onClick={() => setSelectedCard(userCard.card)}
                  />
                </motion.div>
              ))}
            </div>

            {selectedCard && selectedLine && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 flex items-center justify-between p-3 bg-primary/20 border border-primary rounded-lg"
              >
                <span className="text-sm font-semibold text-primary">
                  {selectedCard.name} → Linha {selectedLine}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedCard(null);
                    setSelectedLine(null);
                  }}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handlePlayCard} disabled={isPlaying}>
                    Confirmar Jogada
                  </Button>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>

        {/* Botão para passar turno/finalizar round */}
        {isMyTurn && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center mt-6"
          >
            <Button
              variant="outline"
              onClick={() => finishRound(battleId)}
              disabled={isPlaying}
              className="border-primary/50 hover:bg-primary/20"
            >
              Passar Turno / Finalizar Round
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

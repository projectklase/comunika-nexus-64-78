import { useState } from 'react';
import { useBattle } from '@/hooks/useBattle';
import { useCards } from '@/hooks/useCards';
import { BattleLine } from './BattleLine';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardDisplay } from '@/components/cards/CardDisplay';
import { Sword, Shield, Trophy } from 'lucide-react';

interface BattleArenaProps {
  battleId: string;
}

export function BattleArena({ battleId }: BattleArenaProps) {
  const { battle, currentRound, isMyTurn, myPlayerNumber, playCard, finishRound, isPlaying } = useBattle(battleId);
  const { getCardById } = useCards();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  if (!battle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando batalha...</p>
      </div>
    );
  }

  const myDeckId = myPlayerNumber === 'PLAYER1' ? battle.player1_deck_id : battle.player2_deck_id;
  const myCards = currentRound
    ? myPlayerNumber === 'PLAYER1'
      ? [
          ...currentRound.player1_cards.line1,
          ...currentRound.player1_cards.line2,
          ...currentRound.player1_cards.line3,
        ]
      : [
          ...currentRound.player2_cards.line1,
          ...currentRound.player2_cards.line2,
          ...currentRound.player2_cards.line3,
        ]
    : [];

  const handlePlayCard = () => {
    if (!selectedCard || selectedLine === null) return;
    playCard({ battleId, line: selectedLine, cardId: selectedCard });
    setSelectedCard(null);
    setSelectedLine(null);
  };

  const handleLineClick = (line: number) => {
    if (!isMyTurn || !selectedCard) return;
    setSelectedLine(line);
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header da batalha */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sword className="w-6 h-6" />
              Batalha em Andamento
            </h1>
            <p className="text-sm text-muted-foreground">
              Round {battle.current_round} | Melhor de 3
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <Badge variant="outline" className="mb-2">
                Você
              </Badge>
              <div className="text-2xl font-bold">
                {myPlayerNumber === 'PLAYER1'
                  ? battle.player1_rounds_won
                  : battle.player2_rounds_won}
              </div>
            </div>
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div className="text-center">
              <Badge variant="outline" className="mb-2">
                Oponente
              </Badge>
              <div className="text-2xl font-bold">
                {myPlayerNumber === 'PLAYER1'
                  ? battle.player2_rounds_won
                  : battle.player1_rounds_won}
              </div>
            </div>
          </div>
        </div>

        {isMyTurn ? (
          <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm font-semibold text-primary flex items-center gap-2">
              <Shield className="w-4 h-4" />
              É sua vez! Selecione uma carta e uma linha para jogar.
            </p>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Aguardando jogada do oponente...
            </p>
          </div>
        )}
      </Card>

      {/* Arena com 3 linhas */}
      <div className="space-y-4">
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
      </div>

      {/* Mão do jogador */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Sua Mão</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {/* TODO: Implementar mão do jogador com cartas do deck */}
          <p className="text-sm text-muted-foreground">
            Carregando cartas do seu deck...
          </p>
        </div>

        {selectedCard && selectedLine && (
          <div className="mt-4 flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <span className="text-sm font-semibold">
              Carta selecionada para Linha {selectedLine}
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
          </div>
        )}
      </Card>

      {/* Botão para passar turno/finalizar round */}
      {isMyTurn && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => finishRound(battleId)}
            disabled={isPlaying}
          >
            Passar Turno / Finalizar Round
          </Button>
        </div>
      )}
    </div>
  );
}

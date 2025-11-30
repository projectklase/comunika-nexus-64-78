import { Card } from '@/types/cards';
import { CardInPlay } from '@/hooks/useBattle';
import { CardDisplay } from '@/components/cards/CardDisplay';

interface BattleLineProps {
  lineNumber: 1 | 2 | 3;
  playerCards: CardInPlay[];
  opponentCards: CardInPlay[];
  onCardClick?: (card: Card) => void;
  isMyTurn: boolean;
  canPlayOnLine: boolean;
}

export function BattleLine({
  lineNumber,
  playerCards,
  opponentCards,
  onCardClick,
  isMyTurn,
  canPlayOnLine,
}: BattleLineProps) {
  const lineColors = {
    1: 'border-red-500/30',
    2: 'border-blue-500/30',
    3: 'border-green-500/30',
  };

  const playerTotal = playerCards.reduce((sum, c) => sum + c.atk, 0);
  const opponentTotal = opponentCards.reduce((sum, c) => sum + c.atk, 0);

  return (
    <div className={`relative border-2 ${lineColors[lineNumber]} rounded-lg p-4 space-y-4`}>
      {/* Label da linha */}
      <div className="absolute -top-3 left-4 bg-background px-2 text-xs font-semibold text-muted-foreground">
        Linha {lineNumber}
      </div>

      {/* Cartas do oponente (topo) */}
      <div className="min-h-[100px] flex items-center justify-center gap-2 bg-muted/20 rounded-lg p-2">
        {opponentCards.length > 0 ? (
          <>
            {opponentCards.map((card, idx) => (
              <div key={idx} className="relative">
                <div className="w-16 h-20 bg-card border border-border rounded flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-foreground truncate max-w-full px-1">
                    {card.name}
                  </span>
                  <span className="text-lg font-bold text-primary">{card.atk}</span>
                </div>
              </div>
            ))}
            <div className="ml-2 text-sm font-bold text-muted-foreground">
              Total: {opponentTotal}
            </div>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Vazio</span>
        )}
      </div>

      {/* Divisor */}
      <div className="border-t border-border" />

      {/* Cartas do jogador (baixo) */}
      <div
        className={`min-h-[100px] flex items-center justify-center gap-2 rounded-lg p-2 transition-colors ${
          isMyTurn && canPlayOnLine
            ? 'bg-primary/10 border-2 border-primary/30 cursor-pointer hover:bg-primary/20'
            : 'bg-muted/20'
        }`}
      >
        {playerCards.length > 0 ? (
          <>
            {playerCards.map((card, idx) => (
              <div key={idx} className="relative">
                <div className="w-16 h-20 bg-card border border-border rounded flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-foreground truncate max-w-full px-1">
                    {card.name}
                  </span>
                  <span className="text-lg font-bold text-primary">{card.atk}</span>
                </div>
              </div>
            ))}
            <div className="ml-2 text-sm font-bold text-muted-foreground">
              Total: {playerTotal}
            </div>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            {isMyTurn && canPlayOnLine ? 'Clique para jogar carta aqui' : 'Vazio'}
          </span>
        )}
      </div>
    </div>
  );
}

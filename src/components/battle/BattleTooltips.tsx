import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardEffect } from '@/types/cards';
import { Info } from 'lucide-react';

interface CardTooltipProps {
  card: Card;
  children: React.ReactNode;
}

export const CardTooltip = ({ card, children }: CardTooltipProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs space-y-2">
          <div>
            <p className="font-bold text-sm">{card.name}</p>
            <p className="text-xs text-muted-foreground">{card.category}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>ATK (Ataque):</span>
              <span className="font-bold text-destructive">{card.atk}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>DEF (Defesa):</span>
              <span className="font-bold text-primary">{card.def}</span>
            </div>
          </div>

          {card.effects && card.effects.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-border">
              <p className="text-xs font-semibold">Efeitos:</p>
              {card.effects.map((effect: CardEffect, i: number) => (
                <p key={i} className="text-xs text-muted-foreground">
                  • {effect.description}
                </p>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface LineTooltipProps {
  playerPower: number;
  opponentPower: number;
  children: React.ReactNode;
}

export const LineTooltip = ({ playerPower, opponentPower, children }: LineTooltipProps) => {
  const isWinning = playerPower > opponentPower;
  const isTied = playerPower === opponentPower;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-bold text-sm">Status da Linha</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Seu poder:</span>
                <span className="font-bold text-primary">{playerPower}</span>
              </div>
              <div className="flex justify-between">
                <span>Oponente:</span>
                <span className="font-bold text-destructive">{opponentPower}</span>
              </div>
            </div>
            <div className={`text-xs font-semibold pt-2 border-t border-border ${
              isWinning ? 'text-green-500' : isTied ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {isWinning ? '✓ Você está vencendo!' : isTied ? '⚡ Empate!' : '✗ Oponente vencendo'}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface HPTooltipProps {
  children: React.ReactNode;
}

export const HPTooltip = ({ children }: HPTooltipProps) => {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-bold text-sm flex items-center gap-1">
              <Info className="h-3 w-3" />
              Pontos de Vida (HP)
            </p>
            <p className="text-xs text-muted-foreground">
              Você perde HP quando seu oponente vence um round. 
              Se seu HP chegar a 0, você perde a batalha!
            </p>
            <p className="text-xs font-semibold text-primary pt-2 border-t border-border">
              💡 Dica: Proteja seus pontos de vida vencendo rounds!
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
